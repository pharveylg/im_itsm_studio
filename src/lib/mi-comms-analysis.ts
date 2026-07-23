import MsgReader from "@kenjiuno/msgreader";
import PostalMime, { type Address } from "postal-mime";
import { moduleScopeInstruction, type ItsmModuleKey } from "@/lib/itsm-modules";

export type AnalysisMode = "itsm" | "mi_comms";

export type EmailDocumentInput = {
  name: string;
  contentType?: string;
  content: string;
  encoding?: "utf8" | "base64";
};

export type EmailEvidence = {
  name: string;
  format: "msg" | "eml" | "html" | "text";
  subject: string;
  sender: string;
  to: string[];
  cc: string[];
  bcc: string[];
  sentAt: string | null;
  body: string;
  attachmentNames: string[];
  bytes: number;
  warnings: string[];
};

export type CommunicationsContext = {
  emails: EmailEvidence[];
  totalBytes: number;
  firstCommunicationAt: string | null;
  lastCommunicationAt: string | null;
  stakeholderAddresses: string[];
  promptContext: string;
};

const MAX_EMAIL_BYTES = 4_000_000;
const MAX_TOTAL_EMAIL_BYTES = 12_000_000;
const MAX_EMAIL_BODY_CHARS = 24_000;
const MAX_COMMS_CONTEXT_CHARS = 60_000;

function decode(input: EmailDocumentInput) {
  return Buffer.from(input.content, input.encoding === "base64" ? "base64" : "utf8");
}

function extension(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

// Sections of an email that are not relevant to communications governance analysis
// and should be excluded from the analysis context. Extend this list as needed.
const EMAIL_EXCLUDE_MARKERS = [/bridge\s+details\s*:/i];

function stripExcludedSections(text: string): string {
  for (const marker of EMAIL_EXCLUDE_MARKERS) {
    const idx = text.search(marker);
    if (idx >= 0) return text.slice(0, idx).replace(/\s+$/, "");
  }
  return text;
}

function hasExcludedSection(text: string): boolean {
  return EMAIL_EXCLUDE_MARKERS.some((marker) => marker.test(text));
}

function cleanText(value: string) {
  const cleaned = value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return stripExcludedSections(cleaned).slice(0, MAX_EMAIL_BODY_CHARS);
}

function addressToString(address: Address | undefined): string {
  if (!address) return "";
  if ("group" in address) {
    return (address.group ?? []).map((entry) => addressToString(entry)).filter(Boolean).join(", ");
  }
  return address.name && address.address
    ? `${address.name} <${address.address}>`
    : address.address || address.name || "";
}

function addresses(values?: Address[]) {
  return (values ?? []).map(addressToString).filter(Boolean);
}

function safeDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

async function parseEml(input: EmailDocumentInput, buffer: Buffer): Promise<EmailEvidence> {
  const email = await PostalMime.parse(buffer);
  return {
    name: input.name,
    format: "eml",
    subject: email.subject ?? "(no subject)",
    sender: addressToString(email.from ?? email.sender),
    to: addresses(email.to),
    cc: addresses(email.cc),
    bcc: addresses(email.bcc),
    sentAt: safeDate(email.date),
    body: cleanText(email.text || email.html || ""),
    attachmentNames: email.attachments.map((attachment) => attachment.filename).filter((name): name is string => Boolean(name)),
    bytes: buffer.byteLength,
    warnings: [
      ...(hasExcludedSection(email.text || email.html || "")
        ? ["Trailing 'Bridge Details' section was excluded from analysis."]
        : []),
      ...(email.text || email.html ? [] : ["No readable message body was found."]),
    ],
  };
}

function parseMsg(input: EmailDocumentInput, buffer: Buffer): EmailEvidence {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const reader = new MsgReader(arrayBuffer);
  const data = reader.getFileData();
  if (data.error) throw new Error(`${input.name}: ${data.error}`);

  const recipients = data.recipients ?? [];
  const recipientValue = (type: string) => recipients
    .filter((recipient) => recipient.recipType === type)
    .map((recipient) => String(recipient.email || recipient.name || ""))
    .filter(Boolean);

  const warnings: string[] = [];
  if (!data.body && !data.bodyHtml) warnings.push("No readable message body was found in this MSG export.");
  else if (!data.body && data.bodyHtml) warnings.push("The message body was extracted from HTML because plain text was unavailable.");
  if (hasExcludedSection(data.body || data.bodyHtml || "")) warnings.push("Trailing 'Bridge Details' section was excluded from analysis.");

  return {
    name: input.name,
    format: "msg",
    subject: data.subject ?? "(no subject)",
    sender: data.senderSmtpAddress || data.senderEmail || data.senderName || "",
    to: recipientValue("to"),
    cc: recipientValue("cc"),
    bcc: recipientValue("bcc"),
    sentAt: safeDate(data.clientSubmitTime || data.messageDeliveryTime),
    body: cleanText(data.body || data.bodyHtml || ""),
    attachmentNames: (data.attachments ?? []).map((attachment) => String(attachment.fileName || attachment.fileNameShort || attachment.name || "")).filter(Boolean),
    bytes: buffer.byteLength,
    warnings,
  };
}

function parseSimple(input: EmailDocumentInput, buffer: Buffer): EmailEvidence {
  const ext = extension(input.name);
  const raw = buffer.toString("utf8");
  return {
    name: input.name,
    format: ext === "html" || ext === "htm" ? "html" : "text",
    subject: input.name.replace(/\.[^.]+$/, ""),
    sender: "",
    to: [],
    cc: [],
    bcc: [],
    sentAt: null,
    body: cleanText(raw),
    attachmentNames: [],
    bytes: buffer.byteLength,
    warnings: [
      "Headers were not available; verify sender, recipients, and timestamp manually.",
      ...(hasExcludedSection(raw) ? ["Trailing 'Bridge Details' section was excluded from analysis."] : []),
    ],
  };
}

export async function parseEmailDocument(input: EmailDocumentInput): Promise<EmailEvidence> {
  const buffer = decode(input);
  if (!buffer.byteLength) throw new Error(`${input.name}: email file is empty.`);
  if (buffer.byteLength > MAX_EMAIL_BYTES) throw new Error(`${input.name}: email file exceeds 4 MB.`);

  const ext = extension(input.name);
  if (ext === "msg") return parseMsg(input, buffer);
  if (ext === "eml" || input.contentType?.includes("message/rfc822")) return parseEml(input, buffer);
  if (["txt", "html", "htm"].includes(ext) || input.contentType?.startsWith("text/")) return parseSimple(input, buffer);
  throw new Error(`${input.name}: unsupported email format. Use MSG, EML, HTML, or TXT.`);
}

export async function buildCommunicationsContext(inputs: EmailDocumentInput[]): Promise<CommunicationsContext> {
  const emails = await Promise.all(inputs.slice(0, 30).map(parseEmailDocument));
  const totalBytes = emails.reduce((sum, email) => sum + email.bytes, 0);
  if (totalBytes > MAX_TOTAL_EMAIL_BYTES) throw new Error("Combined email evidence exceeds 12 MB.");

  const dates = emails
    .map((email) => email.sentAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const stakeholderAddresses = Array.from(new Set(
    emails.flatMap((email) => [email.sender, ...email.to, ...email.cc, ...email.bcc]).filter(Boolean),
  ));

  const promptContext = emails
    .map((email, index) => [
      `COMMUNICATION ${index + 1}`,
      `File: ${email.name}`,
      `Format: ${email.format}`,
      `Subject: ${email.subject}`,
      `Sent: ${email.sentAt ?? "unknown"}`,
      `From: ${email.sender || "unknown"}`,
      `To: ${email.to.join("; ") || "unknown"}`,
      `Cc: ${email.cc.join("; ") || "none / unknown"}`,
      `Bcc: ${email.bcc.join("; ") || "none / unknown"}`,
      `Attachments: ${email.attachmentNames.join(", ") || "none"}`,
      `Warnings: ${email.warnings.join(" ") || "none"}`,
      "Message body:",
      email.body,
    ].join("\n"))
    .join("\n\n--- COMMUNICATION BOUNDARY ---\n\n")
    .slice(0, MAX_COMMS_CONTEXT_CHARS);

  return {
    emails,
    totalBytes,
    firstCommunicationAt: dates[0]?.toISOString() ?? null,
    lastCommunicationAt: dates.at(-1)?.toISOString() ?? null,
    stakeholderAddresses,
    promptContext,
  };
}

export function miCommsSystemPrompt() {
  return [
    "You are a senior Major Incident communications governance analyst.",
    "Review both incident handling and communications sent to stakeholders.",
    "Evidence may include ServiceNow incident, major incident, change, and problem XML plus exported emails.",
    "The uploaded governance guidelines are authoritative for SLA targets, required communication types, stakeholder groups, templates, escalation rules, and cadence.",
    "Never invent an SLA. If the guideline does not define a timing target, mark the target as 'not specified in supplied governance'.",
    "Use email sent timestamps and ServiceNow timestamps to calculate elapsed minutes. State timezone or timestamp ambiguity when not explicit.",
    "Assess message accuracy only against facts known at that point in the timeline; do not judge an earlier communication using facts learned later without saying so.",
    "Check recipient coverage using To and CC, but do not infer stakeholder roles from addresses unless the guideline or evidence identifies them.",
    "",
    "FLAG TOKEN RULES:",
    "Every line of narrative analysis MUST start with one of these leading tokens:",
    "EVIDENCE — fact extracted directly from source material",
    "OBSERVATION — AI inference drawn from evidence",
    "ASSUMPTION — AI filled a gap; evidence was incomplete",
    "QUESTION — needs human validation before proceeding",
    "RISK — compliance risk identified",
    "BREACH — compliance breach identified",
    "ACTION — required action",
    "COMPLIANT — meets the requirement",
    "UNKNOWN — indeterminate from available evidence",
    "",
    "Wherever an OBSERVATION, ASSUMPTION, or QUESTION is directly tied to a specific piece of EVIDENCE, keep them together — put EVIDENCE first, then the tied line(s) immediately after with no blank line between. Insert exactly one blank line between one point-group and the next unrelated one.",
    "",
    "TABLE RULES:",
    "Always use real HTML <table> markup, never Markdown pipe syntax.",
    "Add style=\"width:100%;table-layout:fixed;\" on tables and word-wrap:break-word on cells.",
    "",
    "OUTPUT FORMAT:",
    "Respond with ONLY the following tagged blocks, in this exact order, with no other preamble or commentary:",
    "",
    "[EVIDENCE_SCOPE]",
    "List supplied records, communications, date range, and material evidence gaps ONLY for modules allowed by MODULE SCOPE RESTRICTION. Do not name, count, or describe excluded module records. Communications evidence remains in scope for MI Comms Analysis. Each line starts with a flag token.",
    "[/EVIDENCE_SCOPE]",
    "",
    "[EXEC_ASSESSMENT]",
    "Overall RAG-style assessment — only when supported by governance. Numbered findings, each starting with a flag token.",
    "[/EXEC_ASSESSMENT]",
    "",
    "[HANDLING_TIMELINE]",
    "Chronological HTML <table>: Date & Time, Elapsed, Event, Source, Assessment. Render every date as 'DD Mon YYYY, HH:mm TZ' and elapsed duration as '45m', '2h 15m', or '1d 3h'. Never expose raw ISO timestamps when parseable.",
    "[/HANDLING_TIMELINE]",
    "",
    "[MIM_HANDOVERS]",
    "Real HTML <table> for every evidenced MIM handover/changeover. Columns: Handover Date & Time, Outgoing MIM, Incoming MIM, Handover Evidence/Source, Communication Sent By, Communication Subject/Type, Communication Date & Time, Notes. Render dates as 'DD Mon YYYY, HH:mm TZ'. If no handover is evidenced, include one row stating 'No MIM handover evidenced' and identify the evidence gap. Do not infer names without evidence.",
    "[/MIM_HANDOVERS]",
    "",
    "[COMMS_TIMELINE]",
    "Communications SLA HTML <table>: Communication, Sent, Sender/MIM, Recipients, Trigger, Required Deadline, Actual Elapsed, Variance, Pass/Fail, Evidence. Render dates as 'DD Mon YYYY, HH:mm TZ' and durations in human-readable units.",
    "[/COMMS_TIMELINE]",
    "",
    "[STAKEHOLDER_COVERAGE]",
    "Required vs evidenced audiences, recipient coverage, omissions. Each line starts with a flag token.",
    "[/STAKEHOLDER_COVERAGE]",
    "",
    "[MESSAGE_QUALITY]",
    "Assess accuracy, clarity, business impact, affected service, actions/workaround, owner, next-update commitment, cadence, restoration/closure. Each line starts with a flag token.",
    "[/MESSAGE_QUALITY]",
    "",
    "[ITIL_COMMENTARY]",
    "For each material OBSERVATION in this report, add an ITIL 4 best-practice comment. Keep the original OBSERVATION and its paired RECOMMENDATION together with no blank line. Name the applicable practice and explain the relationship. Do not represent ITIL guidance as an exact SLA unless that SLA exists in supplied governance.",
    "[/ITIL_COMMENTARY]",
    "",
    "[HANDLING_GOVERNANCE]",
    "Declaration, ownership, bridge, escalation, technical handling, restoration, problem/change follow-through. Each line starts with a flag token.",
    "[/HANDLING_GOVERNANCE]",
    "",
    "[GOVERNANCE_FINDINGS]",
    "Separate COMPLIANT controls, BREACH items, UNKNOWN controls, and contradictory evidence.",
    "[/GOVERNANCE_FINDINGS]",
    "",
    "[CORRECTIVE_ACTIONS]",
    "Prioritized actions with suggested owner. Each line starts with ACTION.",
    "[/CORRECTIVE_ACTIONS]",
    "",
    "[VALIDATION]",
    "One item per line. Append ' — NOT MET: reason' for failed items. No leading tokens.",
    "Governance SLAs measured against supplied standard",
    "Communication cadence assessed",
    "Stakeholder coverage verified",
    "Message quality reviewed",
    "Incident handling governance assessed",
    "[/VALIDATION]",
  ].join("\n");
}

export function miCommsUserPrompt(options: {
  guidelines: string;
  focus?: string;
  scopedModules?: ItsmModuleKey[];
  itsmContext: string;
  communications: CommunicationsContext;
}) {
  return [
    "GOVERNANCE AND SLA GUIDELINES:",
    options.guidelines || "No governance guideline supplied. Do not assign compliance ratings without defined targets.",
    "",
    "ADDITIONAL REVIEW FOCUS:",
    options.focus?.trim() || "Review end-to-end major incident handling and stakeholder communications.",
    "",
    moduleScopeInstruction(options.scopedModules),
    "SERVICENOW RECORD EVIDENCE:",
    options.itsmContext,
    "",
    "EMAIL COMMUNICATION EVIDENCE:",
    options.communications.promptContext || "No email evidence supplied.",
    "",
    "Include explicit calculations for every timing conclusion. Do not silently assume a start time or SLA target.",
  ].join("\n");
}
