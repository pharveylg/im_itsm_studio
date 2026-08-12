"use client";

import { useMemo, useState } from "react";
import {
  escapeReportHtml,
  extractAllBlocks,
  formatReportDate,
  groupPoints,
  normalizeReportHtml,
  reportPointId,
  type ReportReviewState,
  type ReportTab,
} from "@/lib/report-output";

type ReportContext = {
  documents: Array<{
    name: string;
    importantFields: Record<string, string[]>;
    identifiers: string[];
  }>;
};

type CommunicationsSummary = {
  emailCount: number;
  firstCommunicationAt: string | null;
  lastCommunicationAt: string | null;
  stakeholderCount: number;
  emails: Array<{
    subject: string;
    sender: string;
    sentAt: string | null;
    to: string[];
    cc: string[];
  }>;
} | null;

type FinalReportProps = {
  rawText: string;
  tabs: ReportTab[];
  reviewState: ReportReviewState;
  context?: ReportContext;
  communications?: CommunicationsSummary;
  analysisMode: "itsm" | "mi_comms";
  provider?: string;
  model?: string;
  analyzedAt?: string;
  onClose: () => void;
};

function findField(context: ReportContext | undefined, aliases: string[]): string {
  if (!context) return "Not evidenced";
  const wanted = aliases.map((alias) => alias.toLowerCase());
  for (const document of context.documents) {
    for (const [field, values] of Object.entries(document.importantFields)) {
      if (wanted.includes(field.toLowerCase()) && values[0]?.trim()) return values[0].trim();
    }
  }
  return "Not evidenced";
}

function findIdentifier(context: ReportContext | undefined): string {
  if (!context) return "Major Incident Review";
  const number = context.documents.flatMap((document) => document.identifiers)
    .find((identifier) => /(?:INC|MI|PRB|CHG)\d+/i.test(identifier));
  return number?.replace(/^number=/i, "") ?? "Major Incident Review";
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function reviewedBlockHtml(tag: string, content: string, reviewState: ReportReviewState): string {
  const hasFlags = /\b(?:EVIDENCE|OBSERVATION|ASSUMPTION|QUESTION|RISK|BREACH|ACTION|COMPLIANT|UNKNOWN|ISSUE|RECOMMENDATION)\b/i.test(content);
  if (!hasFlags) return normalizeReportHtml(content);

  return groupPoints(content).map((group, index) => {
    const state = reviewState[reportPointId(tag, index)];
    if (state?.decision === "invalid" || state?.decision === "ignore") return "";
    const lines = group.lines.map((line) => {
      const badge = line.flag
        ? `<span style="display:inline-block;padding:2px 7px;margin-right:8px;border-radius:4px;background:#e4ebd9;color:#11342c;font-size:10px;font-weight:700;text-transform:uppercase;">${escapeReportHtml(line.flag)}</span>`
        : "";
      return `<div style="margin:5px 0;text-align:justify;">${badge}${escapeReportHtml(line.text)}</div>`;
    }).join("");
    const comments = (state?.comments ?? []).map((comment) => (
      `<div style="margin-top:8px;padding:8px 10px;border-left:3px solid #7c3aed;background:#f5f3ff;"><strong>ITSM reviewer comment:</strong> ${escapeReportHtml(comment.text)}</div>`
    )).join("");
    const validation = state?.decision === "valid"
      ? '<span style="display:inline-block;margin-bottom:6px;padding:2px 7px;border-radius:4px;background:#dcfce7;color:#166534;font-size:10px;font-weight:700;">VALIDATED</span>'
      : "";
    return `<div style="margin:10px 0;padding:12px;border:1px solid #d2dcc3;border-radius:8px;background:#fff;">${validation}${lines}${comments}</div>`;
  }).join("");
}

function htmlDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeReportHtml(title)}</title></head>
<body style="margin:0;background:#f3f6ee;font-family:Aptos,Calibri,'Segoe UI',Arial,sans-serif;color:#182720;font-size:14px;line-height:1.55;">
<div style="max-width:980px;margin:0 auto;padding:24px;">
${body}
</div></body></html>`;
}

function buildEml(subject: string, html: string, plain: string): string {
  const boundary = `----ITSM_${Date.now()}`;
  return [
    "To: ",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

export function FinalReport({
  rawText,
  tabs,
  reviewState,
  context,
  communications,
  analysisMode,
  provider,
  model,
  analyzedAt,
  onClose,
}: FinalReportProps) {
  const [recommendation, setRecommendation] = useState("");
  const [copied, setCopied] = useState(false);
  const blocks = useMemo(() => extractAllBlocks(rawText, tabs.map((tab) => tab.tag)), [rawText, tabs]);

  const overview = useMemo(() => ({
    number: findIdentifier(context),
    priority: findField(context, ["priority"]),
    region: findField(context, ["location", "region", "u_region", "business_service", "service_offering"]),
    issue: findField(context, ["short_description", "description", "name"]),
    impact: findField(context, ["business_impact", "impact", "u_business_impact"]),
    resolution: findField(context, ["resolution_summary", "close_notes", "resolution_notes", "fix_notes", "work_notes"]),
  }), [context]);

  const reportBody = useMemo(() => {
    const primaryTags = analysisMode === "mi_comms"
      ? ["EXEC_ASSESSMENT", "HANDLING_TIMELINE", "MIM_HANDOVERS", "COMMS_TIMELINE", "MESSAGE_QUALITY", "ITIL_COMMENTARY", "GOVERNANCE_FINDINGS", "CORRECTIVE_ACTIONS"]
      : ["EXEC_SUMMARY", "TIMELINE", "MODULE_FINDINGS", "CORRELATIONS", "ITIL_COMMENTARY", "RISKS_GAPS", "ACTIONS"];
    const labels: Record<string, string> = {
      EXEC_ASSESSMENT: "Executive Assessment",
      EXEC_SUMMARY: "Executive Summary",
      HANDLING_TIMELINE: "Incident Handling Timeline",
      MIM_HANDOVERS: "MIM Handovers and Communications",
      COMMS_TIMELINE: "Stakeholder Communications and SLA",
      MESSAGE_QUALITY: "MIM Communications Handling Summary",
      ITIL_COMMENTARY: "ITIL Best-Practice Commentary",
      GOVERNANCE_FINDINGS: "Governance Findings",
      CORRECTIVE_ACTIONS: "Corrective Actions",
      TIMELINE: "Handling Timeline",
      MODULE_FINDINGS: "Module Findings",
      CORRELATIONS: "Cross-Module Correlations",
      RISKS_GAPS: "Risks and Gaps",
      ACTIONS: "Recommended Actions",
    };

    const overviewTable = `
      <h2 style="margin:0 0 10px;color:#11342c;font-size:21px;">Incident Overview</h2>
      <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:22px;">
        <tr><th style="width:24%;padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Incident / MI</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.number)}</td></tr>
        <tr><th style="padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Priority</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.priority)}</td></tr>
        <tr><th style="padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Impacted Location / Region</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.region)}</td></tr>
        <tr><th style="padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Issue Description</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.issue)}</td></tr>
        <tr><th style="padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Business Impact</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.impact)}</td></tr>
        <tr><th style="padding:8px;border:1px solid #d2dcc3;background:#e4ebd9;text-align:left;">Resolution Summary</th><td style="padding:8px;border:1px solid #d2dcc3;word-wrap:break-word;">${escapeReportHtml(overview.resolution)}</td></tr>
      </table>`;

    const sections = primaryTags.map((tag) => {
      const content = blocks[tag];
      if (!content) return "";
      return `<h2 style="margin:25px 0 9px;padding-bottom:5px;border-bottom:2px solid #d2dcc3;color:#11342c;font-size:19px;">${labels[tag]}</h2>${reviewedBlockHtml(tag, content, reviewState)}`;
    }).join("");

    const commsSummary = communications
      ? `<div style="margin:18px 0;padding:12px;background:#eef2ff;border-left:4px solid #7c3aed;">
          <strong>Communications packet:</strong> ${communications.emailCount} messages; ${communications.stakeholderCount} distinct sender/recipient identities; window ${escapeReportHtml(communications.firstCommunicationAt ? formatReportDate(communications.firstCommunicationAt) : "unknown")} to ${escapeReportHtml(communications.lastCommunicationAt ? formatReportDate(communications.lastCommunicationAt) : "unknown")}.
        </div>`
      : "";

    const recommendationHtml = `<h2 style="margin:25px 0 9px;padding-bottom:5px;border-bottom:2px solid #d2dcc3;color:#11342c;font-size:19px;">ITSM Recommendation</h2><div style="padding:12px;border:1px solid #d2dcc3;background:#fff;white-space:pre-wrap;">${escapeReportHtml(recommendation || "No additional ITSM recommendation entered.")}</div>`;

    return `
      <div style="padding:20px 22px;background:#11342c;color:#fff;border-radius:10px 10px 0 0;">
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a7f3d0;">ITSM Service Delivery · Analysis Studio</div>
        <h1 style="margin:6px 0 2px;font-size:26px;">${analysisMode === "mi_comms" ? "MI Comms Analysis — Final Report" : "ITSM Analysis — Final Report"}</h1>
        <div style="font-size:12px;color:#d1fae5;">${escapeReportHtml(overview.number)} · Generated ${escapeReportHtml(analyzedAt ? new Date(analyzedAt).toLocaleString() : new Date().toLocaleString())} · ${escapeReportHtml(provider ?? "AI provider")} ${escapeReportHtml(model ?? "")}</div>
      </div>
      <div style="padding:22px;background:#fff;border:1px solid #d2dcc3;border-top:0;">
        ${overviewTable}${commsSummary}${sections}${recommendationHtml}
      </div>`;
  }, [analysisMode, analyzedAt, blocks, communications, model, overview, provider, recommendation, reviewState]);

  const subject = `${analysisMode === "mi_comms" ? "MI Comms Analysis" : "ITSM Analysis"} - ${overview.number}`;
  const fullHtml = useMemo(() => htmlDocument(subject, reportBody), [reportBody, subject]);
  const plainText = useMemo(() => stripHtml(reportBody), [reportBody]);

  async function copyRichReport() {
    try {
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([reportBody], { type: "text/html" }),
            "text/plain": new Blob([plainText], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
    }
  }

  function downloadFile(content: string, type: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function sendToOutlook() {
    await copyRichReport();
    const body = `The formatted ITSM report has been copied to your clipboard. Paste it into this Outlook message to preserve the full table and badge formatting.\n\n${plainText.slice(0, 6000)}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className="rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Final report workspace</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Outlook-ready finalized report</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Invalid and ignored analysis items are excluded. Validated evidence and ITSM reviewer comments are retained.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Close</button>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-bold text-slate-800">ITSM recommendation</span>
        <span className="mt-1 block text-xs text-slate-500">Editable; included in Outlook, HTML, and EML output.</span>
        <textarea
          value={recommendation}
          onChange={(event) => setRecommendation(event.target.value)}
          rows={5}
          placeholder="Enter the final ITSM recommendation, accountable owner, and follow-up expectation…"
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-500"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={copyRichReport} className="rounded-xl bg-pine px-4 py-2.5 text-xs font-bold text-white hover:bg-pine-soft">{copied ? "Copied rich report ✓" : "Copy Outlook HTML"}</button>
        <button type="button" onClick={sendToOutlook} className="rounded-xl bg-[#0078d4] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#106ebe]">Send to Outlook</button>
        <button type="button" onClick={() => downloadFile(fullHtml, "text/html;charset=utf-8", `${overview.number}-final-report.html`)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100">Download HTML</button>
        <button type="button" onClick={() => downloadFile(buildEml(subject, fullHtml, plainText), "message/rfc822", `${overview.number}-final-report.eml`)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100">Download Outlook .eml</button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        Browsers cannot inject rich HTML directly through <code>mailto:</code>. “Send to Outlook” copies the formatted report first, opens a new message, and asks you to paste. The .eml download preserves the complete HTML body.
      </p>

      <div className="mt-7 max-h-[900px] overflow-auto rounded-xl border border-slate-200 bg-[#f3f6ee] p-4">
        <div dangerouslySetInnerHTML={{ __html: reportBody }} />
      </div>
    </section>
  );
}
