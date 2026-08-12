/**
 * Tagged-block output parser and flag-token system.
 * All AI analysis tools use this shared contract.
 */

// ── Tagged Block Extraction ──

export type TaggedBlock = {
  tag: string;
  content: string;
};

/** Extract a named block from tagged output, with truncation fallback. */
export function extractBlock(text: string, tag: string): string {
  const re = new RegExp("\\[" + tag + "\\]([\\s\\S]*?)\\[/" + tag + "\\]", "i");
  const m = text.match(re);
  if (m) return m[1].trim();
  // Model response got cut off before the closing tag — grab everything after the opening tag.
  const om = text.match(new RegExp("\\[" + tag + "\\]([\\s\\S]*)$", "i"));
  return om ? om[1].trim() : "";
}

/** Extract all tagged blocks from output text. */
export function extractAllBlocks(text: string, tags: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tag of tags) {
    result[tag] = extractBlock(text, tag);
  }
  return result;
}

// ── Flag Token System ──

export type FlagToken =
  | "EVIDENCE"
  | "OBSERVATION"
  | "ASSUMPTION"
  | "QUESTION"
  | "RISK"
  | "BREACH"
  | "ACTION"
  | "COMPLIANT"
  | "UNKNOWN"
  | "ISSUE"
  | "RECOMMENDATION";

export type FlagTokenStyle = {
  label: string;
  bg: string;
  text: string;
  border: string;
};

export const FLAG_STYLES: Record<FlagToken, FlagTokenStyle> = {
  EVIDENCE:       { label: "Evidence",       bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  OBSERVATION:    { label: "Observation",    bg: "bg-teal-100",    text: "text-teal-800",    border: "border-teal-200" },
  ASSUMPTION:     { label: "Assumption",     bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200" },
  QUESTION:       { label: "Question",       bg: "bg-violet-100",  text: "text-violet-800",  border: "border-violet-200" },
  RISK:           { label: "Risk",           bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200" },
  BREACH:         { label: "Breach",         bg: "bg-rose-100",    text: "text-rose-800",    border: "border-rose-200" },
  ACTION:         { label: "Action",         bg: "bg-violet-100",  text: "text-violet-800",  border: "border-violet-200" },
  COMPLIANT:      { label: "Compliant",      bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  UNKNOWN:        { label: "Unknown",        bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200" },
  ISSUE:          { label: "Issue",          bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200" },
  RECOMMENDATION: { label: "Recommendation", bg: "bg-violet-100",  text: "text-violet-800",  border: "border-violet-200" },
};

const ALL_FLAGS = Object.keys(FLAG_STYLES).join("|");
const FLAG_PATTERN = new RegExp(
  "^\\s*[-*\\d.)\\s]*\\b(" + ALL_FLAGS + ")\\b\\s*[:\\-]?\\s*(.*)$",
  "i"
);

export type ParsedLine = {
  flag: FlagToken | null;
  text: string;
};

/** Parse a single line for a leading flag token. */
export function parseFlagLine(line: string): ParsedLine {
  const m = line.match(FLAG_PATTERN);
  return m
    ? { flag: m[1].toUpperCase() as FlagToken, text: m[2].trim() }
    : { flag: null, text: line };
}

// ── Point Grouping ──

export type PointGroup = {
  lines: ParsedLine[];
};

/** Group lines into point-groups: tied lines (no blank separator) stay together. */
export function groupPoints(content: string): PointGroup[] {
  const rawGroups = content.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);
  return rawGroups.map((chunk) => ({
    lines: chunk.split("\n").map((line) => parseFlagLine(line)).filter((l) => l.text),
  }));
}

// ── Checklist Parsing ──

export type ChecklistItem = {
  text: string;
  met: boolean;
  reason?: string;
};

/** Parse a checklist block into items with pass/fail status. */
export function parseChecklist(content: string): ChecklistItem[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const notMet = line.match(/NOT MET[:\s]*(.*)/i);
      if (notMet) {
        return { text: line.replace(/\s*—?\s*NOT MET.*/i, "").trim(), met: false, reason: notMet[1].trim() || undefined };
      }
      return { text: line, met: true };
    });
}

// ── Confidence Parsing ──

export type ConfidenceRating = {
  level: "High" | "Medium" | "Low";
  justification: string;
};

export function parseConfidence(content: string): ConfidenceRating | null {
  const m = content.match(/Confidence:\s*(High|Medium|Low)/i);
  if (!m) return null;
  const justification = content.replace(/Confidence:\s*(High|Medium|Low)/i, "").trim();
  return { level: m[1] as ConfidenceRating["level"], justification };
}

// ── Markdown Table to HTML Safety Net ──

/** Convert stray Markdown pipe tables to real HTML tables. */
export function fixMarkdownTables(html: string): string {
  return html.replace(
    /(?:^|\n)((?:\|[^\n]+\|\s*\n)+\|[-:\s|]+\|\s*\n(?:\|[^\n]+\|\s*\n?)*)/gm,
    (_match, tableBlock: string) => {
      const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
      if (rows.length < 2) return tableBlock;

      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map((cell: string) => cell.trim());

      // Detect and skip the separator row
      const isSeparator = (row: string) => /^\|[\s:-]+\|$/.test(row.trim());
      const headerCells = parseRow(rows[0]);
      const dataRows = rows.filter((r: string, i: number) => i > 0 && !isSeparator(r));

      const ths = headerCells.map((c: string) => `<th>${c}</th>`).join("");
      const bodyRows = dataRows
        .map((r: string) => `<tr>${parseRow(r).map((c: string) => `<td>${c}</td>`).join("")}</tr>`)
        .join("\n");

      return `\n<table style="width:100%;table-layout:fixed;"><thead><tr>${ths}</tr></thead><tbody>${bodyRows}</tbody></table>\n`;
    }
  );
}

// ── Tab Definitions ──

export type ReportTab = {
  id: string;
  label: string;
  tag: string; // The tagged-block name to extract
};

export const ITSM_ANALYSIS_TABS: ReportTab[] = [
  { id: "overview",     label: "01 · Overview",            tag: "OVERVIEW" },
  { id: "exec",         label: "02 · Executive Summary",   tag: "EXEC_SUMMARY" },
  { id: "modules",      label: "03 · Module Findings",     tag: "MODULE_FINDINGS" },
  { id: "timeline",     label: "04 · Timeline",            tag: "TIMELINE" },
  { id: "correlations", label: "05 · Cross-Module",        tag: "CORRELATIONS" },
  { id: "risks",        label: "06 · Risks & Gaps",        tag: "RISKS_GAPS" },
  { id: "actions",      label: "07 · Recommended Actions",  tag: "ACTIONS" },
  { id: "review",       label: "08 · Review Items",         tag: "REVIEW_ITEMS" },
  { id: "confidence",   label: "09 · Confidence",           tag: "CONFIDENCE" },
];

export const MI_COMMS_TABS: ReportTab[] = [
  { id: "overview",       label: "01 · Evidence & Scope",         tag: "EVIDENCE_SCOPE" },
  { id: "exec",           label: "02 · Executive Assessment",     tag: "EXEC_ASSESSMENT" },
  { id: "handling",       label: "03 · Handling Timeline",        tag: "HANDLING_TIMELINE" },
  { id: "comms-timeline", label: "04 · Comms SLA",                tag: "COMMS_TIMELINE" },
  { id: "stakeholders",   label: "05 · Stakeholder Coverage",     tag: "STAKEHOLDER_COVERAGE" },
  { id: "quality",        label: "06 · Message Quality",          tag: "MESSAGE_QUALITY" },
  { id: "governance",     label: "07 · Handling Governance",      tag: "HANDLING_GOVERNANCE" },
  { id: "findings",       label: "08 · Governance Findings",      tag: "GOVERNANCE_FINDINGS" },
  { id: "actions",        label: "09 · Corrective Actions",       tag: "CORRECTIVE_ACTIONS" },
  { id: "validation",     label: "10 · Validation",               tag: "VALIDATION" },
];
