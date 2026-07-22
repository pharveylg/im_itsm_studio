import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { XMLParser } from "fast-xml-parser";

export type GuidelineSourceKind = "text" | "xml" | "docx" | "pdf" | "unknown";

export type GuidelineDocumentInput = {
  name: string;
  contentType?: string;
  /** UTF-8 text for plain/xml, or base64 for binary formats such as PDF/DOCX. */
  content: string;
  encoding?: "utf8" | "base64";
};

export type GuidelineDocumentSummary = {
  name: string;
  kind: GuidelineSourceKind;
  bytes: number;
  characters: number;
  wordCount: number;
  warnings: string[];
  excerpt: string;
};

export type GuidelineBundle = {
  text: string;
  documents: GuidelineDocumentSummary[];
  totalBytes: number;
};

const MAX_GUIDELINE_FILE_BYTES = 4_000_000;
const MAX_GUIDELINE_TOTAL_BYTES = 8_000_000;
const MAX_GUIDELINE_TEXT_CHARS = 80_000;
const MAX_EXCERPT_CHARS = 2_000;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  trimValues: true,
  allowBooleanAttributes: true,
});

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(value: string) {
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function decodeContent(input: GuidelineDocumentInput): Buffer {
  const encoding = input.encoding ?? "utf8";
  if (encoding === "base64") {
    return Buffer.from(input.content, "base64");
  }
  return Buffer.from(input.content, "utf8");
}

function detectKind(name: string, contentType = "", buffer: Buffer): GuidelineSourceKind {
  const ext = extensionOf(name);
  const type = contentType.toLowerCase();

  if (ext === "pdf" || type.includes("pdf") || buffer.subarray(0, 4).toString("utf8") === "%PDF") {
    return "pdf";
  }
  if (
    ext === "docx"
    || type.includes("wordprocessingml")
    || type.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    return "docx";
  }
  if (ext === "doc" || type.includes("msword")) {
    return "docx";
  }
  if (ext === "xml" || type.includes("xml") || buffer.subarray(0, 200).toString("utf8").includes("<")) {
    if (ext === "xml" || type.includes("xml") || /^\s*</.test(buffer.toString("utf8"))) {
      return "xml";
    }
  }
  if (ext === "txt" || ext === "md" || ext === "markdown" || type.startsWith("text/") || type === "") {
    return "text";
  }
  return "unknown";
}

function collectXmlText(node: unknown, lines: string[]) {
  if (node === null || node === undefined) return;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    const value = String(node).trim();
    if (value) lines.push(value);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectXmlText(child, lines));
    return;
  }
  if (typeof node === "object") {
    const objectNode = node as Record<string, unknown>;
    Object.entries(objectNode).forEach(([key, value]) => {
      if (key === "#text") {
        collectXmlText(value, lines);
        return;
      }
      if (key.startsWith("@_")) return;
      collectXmlText(value, lines);
    });
  }
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result?.text ?? "");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeWhitespace(result.value ?? "");
}

function extractXmlGuidelineText(buffer: Buffer) {
  const raw = buffer.toString("utf8");
  try {
    const parsed = xmlParser.parse(raw);
    const lines: string[] = [];
    collectXmlText(parsed, lines);
    return normalizeWhitespace(lines.join("\n"));
  } catch {
    return normalizeWhitespace(raw.replace(/<[^>]+>/g, " "));
  }
}

function extractPlainText(buffer: Buffer) {
  return normalizeWhitespace(buffer.toString("utf8"));
}

export async function extractGuidelineDocument(input: GuidelineDocumentInput): Promise<{
  text: string;
  summary: GuidelineDocumentSummary;
}> {
  const name = input.name.trim() || "guidelines.txt";
  const buffer = decodeContent(input);
  const bytes = buffer.byteLength;

  if (!bytes) throw new Error(`${name}: guideline file is empty.`);
  if (bytes > MAX_GUIDELINE_FILE_BYTES) {
    throw new Error(`${name}: guideline file exceeds 4 MB.`);
  }

  const kind = detectKind(name, input.contentType, buffer);
  const warnings: string[] = [];
  let text = "";

  switch (kind) {
    case "pdf":
      text = await extractPdfText(buffer);
      break;
    case "docx":
      if (extensionOf(name) === "doc") {
        throw new Error(`${name}: legacy .doc files are not supported. Save as .docx, PDF, XML, or plain text.`);
      }
      text = await extractDocxText(buffer);
      break;
    case "xml":
      text = extractXmlGuidelineText(buffer);
      break;
    case "text":
      text = extractPlainText(buffer);
      break;
    default:
      throw new Error(`${name}: unsupported guideline format. Use XML, DOCX, PDF, TXT, or MD.`);
  }

  if (!text) {
    throw new Error(`${name}: no readable guideline text could be extracted.`);
  }

  if (text.length > MAX_GUIDELINE_TEXT_CHARS) {
    warnings.push(`Guideline text was truncated to ${MAX_GUIDELINE_TEXT_CHARS.toLocaleString()} characters.`);
    text = text.slice(0, MAX_GUIDELINE_TEXT_CHARS);
  }

  return {
    text,
    summary: {
      name,
      kind,
      bytes,
      characters: text.length,
      wordCount: countWords(text),
      warnings,
      excerpt: text.slice(0, MAX_EXCERPT_CHARS),
    },
  };
}

export async function buildGuidelineBundle(options: {
  freeformText?: string;
  documents?: GuidelineDocumentInput[];
}): Promise<GuidelineBundle> {
  const documents = options.documents ?? [];
  const freeformText = normalizeWhitespace(options.freeformText ?? "");
  const extracted = await Promise.all(documents.slice(0, 8).map((document) => extractGuidelineDocument(document)));
  const totalBytes = extracted.reduce((sum, item) => sum + item.summary.bytes, 0) + Buffer.byteLength(freeformText, "utf8");

  if (totalBytes > MAX_GUIDELINE_TOTAL_BYTES) {
    throw new Error("Guideline materials exceed the 8 MB combined limit.");
  }

  const parts = [
    freeformText ? `FREEFORM GUIDELINES\n${freeformText}` : "",
    ...extracted.map((item, index) => `GUIDELINE DOCUMENT ${index + 1}: ${item.summary.name} (${item.summary.kind})\n${item.text}`),
  ].filter(Boolean);

  const text = parts.join("\n\n--- GUIDELINE BOUNDARY ---\n\n").slice(0, MAX_GUIDELINE_TEXT_CHARS * 2);
  if (!text) {
    throw new Error("Add guideline text or upload at least one guideline document.");
  }

  return {
    text,
    documents: extracted.map((item) => item.summary),
    totalBytes,
  };
}

export function maxGuidelineFileBytes() {
  return MAX_GUIDELINE_FILE_BYTES;
}

export function maxGuidelineTotalBytes() {
  return MAX_GUIDELINE_TOTAL_BYTES;
}
