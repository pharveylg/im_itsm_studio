"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { GuidelinesManager } from "@/components/guidelines-manager";

const DEFAULT_GUIDELINES = `Optional freeform notes for this run.

You can leave this blank if the uploaded guideline documents already define the full review standard.

When no stronger standard is provided, review the packet across:
- Incidents
- Major Incidents
- Change
- Problem
- Knowledge
- Service Catalog`;

type XmlFile = {
  id: string;
  name: string;
  xml: string;
  bytes: number;
};

type EmailFile = {
  id: string;
  name: string;
  contentType: string;
  content: string;
  encoding: "utf8" | "base64";
  bytes: number;
};

type AnalysisMode = "itsm" | "mi_comms";

type GuidelineFile = {
  id: string;
  name: string;
  contentType: string;
  encoding: "utf8" | "base64";
  content: string;
  bytes: number;
  kind: "xml" | "docx" | "pdf" | "text";
};

type DocumentSummary = {
  name: string;
  root: string;
  bytes: number;
  nodeCount: number;
  recordCount: number;
  likelyTables: string[];
  likelyModules: string[];
  identifiers: string[];
  importantFields: Record<string, string[]>;
  warnings: string[];
};

type GuidelineSummary = {
  name: string;
  kind: string;
  bytes: number;
  characters: number;
  wordCount: number;
  warnings: string[];
  excerpt: string;
};

type AnalysisContext = {
  documents: DocumentSummary[];
  totalBytes: number;
  totalNodes: number;
  totalRecords: number;
  detectedModules?: string[];
  coveredModules?: string[];
  missingModules?: string[];
};

type AnalyzeResponse = {
  ok: boolean;
  configured?: boolean;
  error?: string;
  analysis?: string;
  analysisMode?: AnalysisMode;
  provider?: string;
  model?: string;
  analyzedAt?: string;
  communications?: {
    emailCount: number;
    totalBytes: number;
    firstCommunicationAt: string | null;
    lastCommunicationAt: string | null;
    stakeholderCount: number;
    emails: Array<{
      name: string;
      format: string;
      subject: string;
      sender: string;
      to: string[];
      cc: string[];
      bcc: string[];
      sentAt: string | null;
      attachmentNames: string[];
      bytes: number;
      warnings: string[];
    }>;
  } | null;
  context?: AnalysisContext;
  guidelines?: {
    documents?: GuidelineSummary[];
    totalBytes?: number;
    characters: number;
    sourceIds?: string[];
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
  costEstimateUsd?: number;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const localRecordEstimate = (xml: string) => {
  const identifiers = (xml.match(/<(?:number|sys_id|message_key)(?:\s[^>]*)?>/gi) ?? []).length;
  const recordTags = (xml.match(/<(?:record|result|item|row)(?:\s[^>]*)?>/gi) ?? []).length;
  return Math.max(identifiers, recordTags);
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function detectGuidelineKind(file: File): GuidelineFile["kind"] | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".pdf") || type.includes("pdf")) return "pdf";
  if (name.endsWith(".docx") || type.includes("wordprocessingml")) return "docx";
  if (name.endsWith(".xml") || type.includes("xml")) return "xml";
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown") || type.startsWith("text/")) return "text";
  return null;
}

function kindBadge(kind: string) {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "xml":
      return "XML";
    case "text":
      return "TEXT";
    default:
      return kind.toUpperCase();
  }
}

function MarkdownOutput({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-700">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trimEnd());
        const first = lines[0] ?? "";
        if (/^#{1,3}\s/.test(first)) {
          return <h3 key={index} className="text-xl font-black text-slate-950">{first.replace(/^#{1,3}\s+/, "")}</h3>;
        }

        if (lines.every((line) => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-2 pl-5 marker:text-sky-500">
              {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^(?:[-*]|\d+[.)])\s+/, "")}</li>)}
            </ul>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "sky" | "emerald" | "amber" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-950",
    sky: "bg-sky-50 text-sky-950",
    emerald: "bg-emerald-50 text-emerald-950",
    amber: "bg-amber-50 text-amber-950",
  };
  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] opacity-60">{label}</div>
    </div>
  );
}

type AiProviderOption = {
  key: string;
  name: string;
  model: string;
};

export function XmlAnalysisWorkbench() {
  const [files, setFiles] = useState<XmlFile[]>([]);
  const [emailFiles, setEmailFiles] = useState<EmailFile[]>([]);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("itsm");
  const [guidelineFiles, setGuidelineFiles] = useState<GuidelineFile[]>([]);
  const [guidelines, setGuidelines] = useState(DEFAULT_GUIDELINES);
  const [focus, setFocus] = useState("");
  const [includeRaw, setIncludeRaw] = useState(true);
  const [isDraggingXml, setIsDraggingXml] = useState(false);
  const [isDraggingGuidelines, setIsDraggingGuidelines] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [providers, setProviders] = useState<AiProviderOption[]>([]);
  const [selectedGuidelineIds, setSelectedGuidelineIds] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available providers on mount
  useEffect(() => {
    fetch("/api/ai-providers")
      .then((r) => r.json())
      .then((data: { providers: { key: string; name: string; model: string; enabled: boolean }[] }) => {
        const enabled = data.providers.filter((p) => p.enabled);
        setProviders(enabled);
        if (enabled.length > 0 && selectedProvider === "default") {
          setSelectedProvider(enabled[0].key);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.bytes, 0), [files]);
  const emailBytes = useMemo(() => emailFiles.reduce((sum, file) => sum + file.bytes, 0), [emailFiles]);
  const estimatedRecords = useMemo(() => files.reduce((sum, file) => sum + localRecordEstimate(file.xml), 0), [files]);
  const guidelineBytes = useMemo(() => guidelineFiles.reduce((sum, file) => sum + file.bytes, 0), [guidelineFiles]);
  const hasGuidance = selectedGuidelineIds.length > 0 || guidelineFiles.length > 0 || guidelines.trim().length > 0;
  const hasMiGovernance = selectedGuidelineIds.length > 0;
  const canAnalyze = files.length > 0
    && hasGuidance
    && (analysisMode !== "mi_comms" || (emailFiles.length > 0 && hasMiGovernance));

  async function addXmlFileList(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml");
    const loaded = await Promise.all(incoming.slice(0, 12).map(async (file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      xml: await file.text(),
      bytes: file.size,
    })));
    setFiles((current) => {
      const existing = new Set(current.map((file) => file.id));
      return [...current, ...loaded.filter((file) => !existing.has(file.id))].slice(0, 12);
    });
    setResult(null);
  }

  async function addEmailFileList(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) =>
      /\.(msg|eml|html?|txt)$/i.test(file.name)
      || file.type === "message/rfc822"
      || file.type.startsWith("text/"),
    );
    const loaded = await Promise.all(incoming.slice(0, 30).map(async (file) => {
      const isBinary = file.name.toLowerCase().endsWith(".msg");
      return {
        id: `email-${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        contentType: file.type,
        content: isBinary ? arrayBufferToBase64(await file.arrayBuffer()) : await file.text(),
        encoding: isBinary ? "base64" as const : "utf8" as const,
        bytes: file.size,
      };
    }));
    setEmailFiles((current) => {
      const existing = new Set(current.map((file) => file.id));
      return [...current, ...loaded.filter((file) => !existing.has(file.id))].slice(0, 30);
    });
    setResult(null);
  }

  async function addGuidelineFileList(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
      .map((file) => ({ file, kind: detectGuidelineKind(file) }))
      .filter((entry): entry is { file: File; kind: GuidelineFile["kind"] } => Boolean(entry.kind));

    const loaded = await Promise.all(incoming.slice(0, 8).map(async ({ file, kind }) => {
      const isBinary = kind === "pdf" || kind === "docx";
      const content = isBinary
        ? arrayBufferToBase64(await file.arrayBuffer())
        : await file.text();
      return {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        contentType: file.type,
        encoding: isBinary ? "base64" as const : "utf8" as const,
        content,
        bytes: file.size,
        kind,
      };
    }));

    setGuidelineFiles((current) => {
      const existing = new Set(current.map((file) => file.id));
      return [...current, ...loaded.filter((file) => !existing.has(file.id))].slice(0, 8);
    });
    setResult(null);
  }

  function handleXmlFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addXmlFileList(event.target.files);
    event.target.value = "";
  }

  function handleGuidelineFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addGuidelineFileList(event.target.files);
    event.target.value = "";
  }

  function handleXmlDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingXml(false);
    if (event.dataTransfer.files) void addXmlFileList(event.dataTransfer.files);
  }

  function handleGuidelineDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingGuidelines(false);
    if (event.dataTransfer.files) void addGuidelineFileList(event.dataTransfer.files);
  }

  function addPastedXml() {
    const xml = pasteRef.current?.value.trim() ?? "";
    if (!xml) return;
    const id = `pasted-${Date.now()}`;
    setFiles((current) => [...current, {
      id,
      name: `pasted-extract-${current.length + 1}.xml`,
      xml,
      bytes: new TextEncoder().encode(xml).length,
    }].slice(0, 12));
    if (pasteRef.current) pasteRef.current.value = "";
    setResult(null);
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
    setResult(null);
  }

  function removeEmailFile(id: string) {
    setEmailFiles((current) => current.filter((file) => file.id !== id));
    setResult(null);
  }

  function removeGuidelineFile(id: string) {
    setGuidelineFiles((current) => current.filter((file) => file.id !== id));
    setResult(null);
  }

  function clearAll() {
    setFiles([]);
    setEmailFiles([]);
    setResult(null);
  }

  async function analyze() {
    if (!files.length) {
      setResult({ ok: false, error: "Add at least one XML extract first." });
      return;
    }
    if (!hasGuidance) {
      setResult({ ok: false, error: "Select a stored governance guideline or add freeform guidance before analyzing." });
      return;
    }
    if (analysisMode === "mi_comms" && !emailFiles.length) {
      setResult({ ok: false, error: "Add at least one stakeholder communication email for MI Comms Analysis." });
      return;
    }
    if (analysisMode === "mi_comms" && !selectedGuidelineIds.length) {
      setResult({ ok: false, error: "Select a stored MI communications governance guideline before running MI Comms Analysis." });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: files.map(({ name, xml }) => ({ name, xml })),
          emailDocuments: emailFiles.map(({ name, contentType, content, encoding }) => ({
            name,
            contentType,
            content,
            encoding,
          })),
          analysisMode,
          guidelines,
          guidelineIds: selectedGuidelineIds,
          focus,
          includeRaw,
          provider: selectedProvider === "default" ? undefined : selectedProvider,
        }),
      });
      const payload = (await response.json()) as AnalyzeResponse;
      setResult(payload);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Unable to reach the analysis service." });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function copyAnalysis() {
    if (!result?.analysis) return;
    await navigator.clipboard.writeText(result.analysis);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadAnalysis() {
    if (!result?.analysis) return;
    const blob = new Blob([result.analysis], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.analysisMode === "mi_comms" ? "mi-comms-analysis.md" : "itsm-analysis.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eff6ff_48%,#ecfeff_100%)] px-5 py-6 text-slate-900 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">Semi-manual workflow</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">XML + multi-format guidelines</span>
              </div>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-sky-700">ITSM Service Delivery · Analysis Studio</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Bring the records. Bring the standard.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Upload the ServiceNow XML extracts you are authorized to share, then supply the review standard as another XML extract, a Word document, a PDF, or plain text. Analysis is scoped to the major ITSM modules: incidents, major incidents, change, problem, knowledge, and service catalog.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Incidents", "Major Incidents", "Change", "Problem", "Knowledge", "Service Catalog"].map((module) => (
                  <span key={module} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {module}
                  </span>
                ))}
              </div>
            </div>
            <div className="max-w-sm rounded-3xl border border-sky-100 bg-sky-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-600 text-xl text-white">✦</div>
                <div>
                  <p className="font-bold text-slate-950">Manual control by design</p>
                  <p className="text-xs text-slate-600">You choose the evidence and the rules.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">Nothing is pulled automatically. The app only analyzes the extracts and guideline files you add in this session.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[470px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Review type</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setAnalysisMode("itsm"); setResult(null); }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    analysisMode === "itsm"
                      ? "border-pine bg-pine text-paper shadow-md"
                      : "border-line bg-white text-ink hover:bg-mist"
                  }`}
                >
                  <span className="block text-sm font-bold">ITSM Analysis</span>
                  <span className={`mt-1 block text-[11px] leading-4 ${analysisMode === "itsm" ? "text-paper/70" : "text-ink/50"}`}>
                    General cross-module governance review
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAnalysisMode("mi_comms"); setResult(null); }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    analysisMode === "mi_comms"
                      ? "border-violet-700 bg-violet-700 text-white shadow-md"
                      : "border-line bg-white text-ink hover:bg-violet-50"
                  }`}
                >
                  <span className="block text-sm font-bold">MI Comms Analysis</span>
                  <span className={`mt-1 block text-[11px] leading-4 ${analysisMode === "mi_comms" ? "text-white/75" : "text-ink/50"}`}>
                    Email cadence, SLA, stakeholder & handling review
                  </span>
                </button>
              </div>
              {analysisMode === "mi_comms" && (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-800">
                  Add incident/change/problem XML, stakeholder emails, and your stored MI governance guideline. Timing targets are taken only from that guideline.
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">01 / Source material</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Add XML extracts</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Add one or more ServiceNow exports. Related records can be separate files.</p>
                </div>
                {files.length > 0 && <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-500 hover:text-rose-600">Clear all</button>}
              </div>

              <div
                onDragOver={(event) => { event.preventDefault(); setIsDraggingXml(true); }}
                onDragLeave={() => setIsDraggingXml(false)}
                onDrop={handleXmlDrop}
                className={`mt-5 rounded-3xl border-2 border-dashed p-6 text-center transition ${isDraggingXml ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">⇧</div>
                <p className="mt-3 font-bold text-slate-900">Drop ServiceNow XML here</p>
                <p className="mt-1 text-xs text-slate-500">Up to 12 files · 1.5 MB each · 5 MB total</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800">Browse XML</button>
                <input ref={fileInputRef} type="file" accept=".xml,text/xml,application/xml" multiple onChange={handleXmlFileChange} className="hidden" />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Paste an XML extract</label>
                <textarea ref={pasteRef} rows={4} placeholder="Paste XML here, then add it to the source set..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs outline-none ring-sky-500 focus:ring-4" />
                <button type="button" onClick={addPastedXml} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">Add pasted XML</button>
              </div>

              <div className="mt-5 space-y-2">
                {files.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">Your selected extracts will appear here.</div>
                ) : files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-black text-amber-800">XML</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(file.bytes)} · ~{localRecordEstimate(file.xml)} record markers</p>
                    </div>
                    <button type="button" onClick={() => removeFile(file.id)} className="rounded-full px-2 py-1 text-lg leading-none text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${file.name}`}>×</button>
                  </div>
                ))}
              </div>

              {files.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Files" value={files.length} tone="sky" /><Stat label="Payload" value={formatBytes(totalBytes)} /><Stat label="Markers" value={estimatedRecords} tone="amber" /></div>}

              {analysisMode === "mi_comms" && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Stakeholder communications</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Upload outbound updates, escalations, restoration notices, and closure communications.</p>
                    </div>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">Required</span>
                  </div>
                  <div className="mt-3 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 text-center">
                    <p className="font-bold text-slate-900">Add email evidence</p>
                    <p className="mt-1 text-xs text-slate-500">Outlook MSG · EML · HTML · TXT · up to 30 files</p>
                    <button
                      type="button"
                      onClick={() => emailInputRef.current?.click()}
                      className="mt-3 rounded-full bg-violet-700 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-violet-800"
                    >
                      Browse Emails
                    </button>
                    <input
                      ref={emailInputRef}
                      type="file"
                      accept=".msg,.eml,.html,.htm,.txt,message/rfc822,text/html,text/plain"
                      multiple
                      onChange={(event) => {
                        if (event.target.files) void addEmailFileList(event.target.files);
                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </div>
                  {emailFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {emailFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[9px] font-black text-violet-700">
                            {file.name.split(".").pop()?.toUpperCase() || "MAIL"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                            <p className="text-[10px] text-ink/45">{formatBytes(file.bytes)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEmailFile(file.id)}
                            className="rounded-full px-2 py-1 text-lg leading-none text-slate-300 hover:text-rose-500"
                            aria-label={`Remove ${file.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <Stat label="Emails" value={emailFiles.length} tone="sky" />
                        <Stat label="Email payload" value={formatBytes(emailBytes)} tone="amber" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

             <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
               <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">02 / Analysis contract</p>
               <h2 className="mt-2 text-2xl font-black text-slate-950">Guidelines</h2>
               <p className="mt-2 text-sm leading-6 text-slate-600">Select stored guidelines or upload new ones. Stored guidelines are reused across analyses.</p>

               <div className="mt-5">
                 <GuidelinesManager
                   selectedIds={selectedGuidelineIds}
                   onSelectionChange={setSelectedGuidelineIds}
                   compact
                 />
               </div>

               {analysisMode === "mi_comms" && (
                 <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${
                   selectedGuidelineIds.length
                     ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                     : "border-amber-200 bg-amber-50 text-amber-800"
                 }`}>
                   {selectedGuidelineIds.length
                     ? "Governance standard selected. SLA and cadence findings will be measured against it."
                     : "Select or store an MI communications governance guideline. The report will not run without an evidence-based SLA standard."}
                 </div>
               )}

               <label className="mt-5 block">
                 <span className="text-sm font-bold text-slate-700">Optional freeform notes</span>
                 <textarea value={guidelines} onChange={(event) => setGuidelines(event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none ring-sky-500 focus:ring-4" />
               </label>
               <label className="mt-4 block">
                 <span className="text-sm font-bold text-slate-700">Optional focus for this run</span>
                 <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="e.g. Score this against the major-incident review checklist and call out SLA evidence gaps." className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-sky-500 focus:ring-4" />
               </label>
               <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                 <input type="checkbox" checked={includeRaw} onChange={(event) => setIncludeRaw(event.target.checked)} className="mt-1 size-4 rounded border-slate-300" />
                 <span>
                   <span className="block text-sm font-bold text-slate-700">Include bounded raw XML excerpts</span>
                   <span className="mt-1 block text-xs leading-5 text-slate-500">Useful for exact context, but send only data approved for your AI provider.</span>
                 </span>
               </label>

              {/* AI Provider Selector */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Analysis engine
                </label>
                {providers.length === 0 ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      No providers configured. Add one in{" "}
                      <a href="/settings" className="text-indigo-600 hover:underline">Settings → AI Providers</a>
                      .
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-4"
                  >
                    {providers.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.model})
                      </option>
                    ))}
                    <option value="default">System default</option>
                  </select>
                )}
                <p className="mt-2 text-[10px] text-slate-400">
                  Choose which AI provider analyzes this packet. Configure more in Settings.
                </p>
              </div>

              <button
                type="button"
                onClick={analyze}
                disabled={isAnalyzing || !canAnalyze || providers.length === 0}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing extracts..." : "Analyze with AI"}
              </button>
            </section>
          </aside>

          <section className="min-w-0 space-y-6">
            {result?.error && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
                <h2 className="font-black">Analysis could not run</h2>
                <p className="mt-2 text-sm leading-6">{result.error}</p>
                {result.configured === false && <p className="mt-3 rounded-2xl bg-white/70 p-3 font-mono text-xs">Configure AI_API_KEY or OPENAI_API_KEY on the server.</p>}
              </div>
            )}

            {result?.guidelines && (
              <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Governance inspection</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">Review standard loaded</h2>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">
                    {result.guidelines.sourceIds?.length ?? 0} stored guideline{(result.guidelines.sourceIds?.length ?? 0) === 1 ? "" : "s"} · {result.guidelines.characters.toLocaleString()} chars
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  The selected stored guideline and freeform notes were combined into the governing review standard for this run.
                </p>
              </section>
            )}

            {result?.communications && (
              <section className="rounded-[2rem] border border-violet-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Communications evidence</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">Stakeholder email packet parsed</h2>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">
                    MI Comms Analysis
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Emails" value={result.communications.emailCount} tone="sky" />
                  <Stat label="Stakeholders" value={result.communications.stakeholderCount} tone="emerald" />
                  <Stat label="Email bytes" value={formatBytes(result.communications.totalBytes)} />
                  <Stat
                    label="Comms window"
                    value={
                      result.communications.firstCommunicationAt && result.communications.lastCommunicationAt
                        ? `${Math.max(0, Math.round((new Date(result.communications.lastCommunicationAt).getTime() - new Date(result.communications.firstCommunicationAt).getTime()) / 60000))}m`
                        : "Unknown"
                    }
                    tone="amber"
                  />
                </div>
                <div className="mt-5 space-y-2">
                  {result.communications.emails.map((email) => (
                    <div key={email.name} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate text-sm font-bold text-slate-900">{email.subject}</p>
                        <span className="shrink-0 font-mono text-[10px] text-slate-500">
                          {email.sentAt ? new Date(email.sentAt).toLocaleString() : "timestamp unavailable"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {email.sender || "unknown sender"} → {email.to.join("; ") || "unknown recipients"}
                        {email.cc.length ? ` · cc ${email.cc.join("; ")}` : ""}
                      </p>
                      {email.warnings.map((warning) => (
                        <p key={warning} className="mt-2 text-[10px] font-semibold text-amber-700">⚠ {warning}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result?.context && (
              <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Extract inspection</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">What was understood from the XML</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Validated before AI submission</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Documents" value={result.context.documents.length} tone="sky" />
                  <Stat label="Bytes" value={formatBytes(result.context.totalBytes)} />
                  <Stat label="Records found" value={result.context.totalRecords} tone="emerald" />
                  <Stat label="XML nodes" value={result.context.totalNodes} tone="amber" />
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Major ITSM module coverage</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(result.context.coveredModules ?? []).map((module) => (
                      <span key={`covered-${module}`} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        {module.replaceAll("_", " ")}
                      </span>
                    ))}
                    {(result.context.missingModules ?? []).map((module) => (
                      <span key={`missing-${module}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                        {module.replaceAll("_", " ")} · not evidenced
                      </span>
                    ))}
                    {!result.context.coveredModules?.length && !result.context.missingModules?.length && (
                      <span className="text-sm text-slate-500">Module detection unavailable for this response.</span>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {result.context.documents.map((document) => (
                    <div key={document.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-slate-900">{document.name}</p>
                        <span className="text-xs text-slate-500">{document.root} · {document.recordCount} records · {formatBytes(document.bytes)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[...document.likelyModules, ...document.likelyTables].slice(0, 8).map((item) => (
                          <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{item}</span>
                        ))}
                      </div>
                      {document.warnings.map((warning) => <p key={warning} className="mt-3 text-xs font-semibold text-amber-700">⚠ {warning}</p>)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result?.analysis ? (
              <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70 sm:p-8">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">AI review output</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">Operational analysis</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {(result as { provider?: string }).provider || "unknown"}
                      </span>
                      <span>·</span>
                      <span>{result.model}</span>
                      <span>·</span>
                      <span>{result.analyzedAt ? new Date(result.analyzedAt).toLocaleString() : "just now"}</span>
                      {(result as { latencyMs?: number }).latencyMs !== undefined && (
                        <>
                          <span>·</span>
                          <span>{(result as { latencyMs: number }).latencyMs}ms</span>
                        </>
                      )}
                      {(result as { costEstimateUsd?: number }).costEstimateUsd !== undefined && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600">
                            ~${(result as { costEstimateUsd: number }).costEstimateUsd.toFixed(4)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={copyAnalysis} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{copied ? "Copied" : "Copy"}</button>
                    <button type="button" onClick={downloadAnalysis} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Download .md</button>
                  </div>
                </div>
                <div className="mt-7"><MarkdownOutput markdown={result.analysis} /></div>
              </section>
            ) : !result?.context && (
              <div className="grid min-h-[650px] place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white/65 p-10 text-center shadow-sm">
                <div className="max-w-xl">
                  <div className="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] bg-slate-950 text-3xl text-white">◎</div>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-sky-700">Ready for review</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Select the evidence. Attach the standard. Analyze.</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    Keep the handoff manual so you can curate ServiceNow extracts and supply the exact review criteria from XML, Word, PDF, or plain text. The review model covers incidents, major incidents, change, problem, knowledge, and service catalog.
                  </p>
                  <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-bold text-slate-900">Curate</p><p className="mt-1 text-xs leading-5 text-slate-500">Choose XML extracts across the major ITSM modules.</p></div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-bold text-slate-900">Standardize</p><p className="mt-1 text-xs leading-5 text-slate-500">Upload XML, DOCX, PDF, or text guidelines.</p></div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-bold text-slate-900">Correlate</p><p className="mt-1 text-xs leading-5 text-slate-500">Trace incident, problem, change, knowledge, and catalog links.</p></div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/60 px-5 py-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Privacy boundary: this app only submits the extracts and guideline files you add.</p>
          <p>Do not include passwords, tokens, session cookies, or data your organization has not approved for AI processing.</p>
        </footer>
      </div>
    </main>
  );
}
