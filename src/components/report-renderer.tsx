"use client";

import { useMemo, useState } from "react";
import {
  extractAllBlocks,
  fixMarkdownTables,
  groupPoints,
  parseChecklist,
  parseConfidence,
  FLAG_STYLES,
  type FlagToken,
  type ParsedLine,
  type PointGroup,
  type ReportTab,
} from "@/lib/report-output";

type ReportRendererProps = {
  rawText: string;
  tabs: ReportTab[];
};

function FlagBadge({ flag }: { flag: FlagToken }) {
  const style = FLAG_STYLES[flag];
  return (
    <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function FlaggedLine({ line }: { line: ParsedLine }) {
  if (!line.flag) {
    // Plain text line — render as body text or HTML
    if (line.text.startsWith("<")) {
      return <div className="text-justify text-sm leading-6 text-ink/80" dangerouslySetInnerHTML={{ __html: fixMarkdownTables(line.text) }} />;
    }
    return <p className="text-justify text-sm leading-6 text-ink/80">{line.text}</p>;
  }

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 pt-0.5">
        <FlagBadge flag={line.flag} />
      </div>
      <p className="min-w-0 flex-1 text-justify text-sm leading-6 text-ink/90">
        {line.text}
      </p>
    </div>
  );
}

function PointGroupCard({ group }: { group: PointGroup }) {
  if (group.lines.length === 1) {
    return (
      <div className="py-1.5">
        <FlaggedLine line={group.lines[0]} />
      </div>
    );
  }

  // Multi-line point group: primary line + tied follow-on lines
  const [primary, ...tied] = group.lines;
  const borderColor = primary.flag ? FLAG_STYLES[primary.flag].border : "border-slate-200";

  return (
    <div className={`rounded-xl border-l-2 ${borderColor} py-1.5 pl-3`}>
      <FlaggedLine line={primary} />
      {tied.map((line, i) => (
        <div key={i} className="mt-1.5 ml-0.5">
          <FlaggedLine line={line} />
        </div>
      ))}
    </div>
  );
}

function ChecklistPanel({ content }: { content: string }) {
  const items = parseChecklist(content);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${item.met ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <span className={`shrink-0 text-lg ${item.met ? "text-emerald-600" : "text-amber-600"}`}>
            {item.met ? "✓" : "⚠"}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${item.met ? "text-emerald-900" : "text-amber-900"}`}>{item.text}</p>
            {item.reason && <p className="mt-0.5 text-xs text-amber-700">{item.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfidencePanel({ content }: { content: string }) {
  const rating = parseConfidence(content);
  if (!rating) {
    return <BlockContent content={content} />;
  }
  const colors = {
    High: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
    Medium: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
    Low: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  };
  const c = colors[rating.level];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${c.text} ${c.bg}`}>
          {rating.level}
        </span>
        <span className="text-sm font-bold text-ink">Confidence Assessment</span>
      </div>
      {rating.justification && (
        <p className="mt-3 text-justify text-sm leading-6 text-ink/80">{rating.justification}</p>
      )}
    </div>
  );
}

function BlockContent({ content }: { content: string }) {
  // Detect if content has flag tokens → use point grouping
  const hasFlags = /\b(?:EVIDENCE|OBSERVATION|ASSUMPTION|QUESTION|RISK|BREACH|ACTION|COMPLIANT|UNKNOWN|ISSUE|RECOMMENDATION)\b/i.test(content);

  if (hasFlags) {
    const groups = groupPoints(content);
    return (
      <div className="space-y-3">
        {groups.map((group, i) => (
          <PointGroupCard key={i} group={group} />
        ))}
      </div>
    );
  }

  // Detect if content contains HTML tables
  const hasHtml = /<(?:table|tr|td|th|h[1-6]|p|ul|ol|li|div)\b/i.test(content);
  if (hasHtml) {
    const fixed = fixMarkdownTables(content);
    return (
      <div
        className="prose prose-sm max-w-none text-justify [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words"
        dangerouslySetInnerHTML={{ __html: fixed }}
      />
    );
  }

  // Plain text with potential markdown tables
  const fixed = fixMarkdownTables(content);
  if (fixed !== content) {
    return (
      <div
        className="prose prose-sm max-w-none text-justify [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words"
        dangerouslySetInnerHTML={{ __html: fixed }}
      />
    );
  }

  // Plain text fallback
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        // Check if it's a numbered or bulleted list
        if (lines.every((l) => /^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5 pl-5 text-sm leading-6 text-ink/80 marker:text-ink/30">
              {lines.map((l, j) => <li key={j}>{l.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")}</li>)}
            </ul>
          );
        }
        // Check for headings
        const first = lines[0] ?? "";
        if (/^#{1,3}\s/.test(first)) {
          return <h3 key={i} className="text-lg font-bold text-ink">{first.replace(/^#{1,3}\s+/, "")}</h3>;
        }
        return (
          <p key={i} className="text-justify text-sm leading-6 text-ink/80 whitespace-pre-wrap">
            {para}
          </p>
        );
      })}
    </div>
  );
}

export function ReportRenderer({ rawText, tabs }: ReportRendererProps) {
  const blocks = useMemo(() => extractAllBlocks(rawText, tabs.map((t) => t.tag)), [rawText, tabs]);
  const populatedTabs = useMemo(() => tabs.filter((tab) => blocks[tab.tag]), [tabs, blocks]);
  const [activeTab, setActiveTab] = useState(populatedTabs[0]?.id ?? "");

  // If no tagged blocks were found, render the raw text as a fallback
  if (populatedTabs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          The AI response did not use the expected tagged-block format. Displaying raw output.
        </div>
        <BlockContent content={rawText} />
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {populatedTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {populatedTabs.map((tab) => {
        if (tab.id !== activeTab) return null;
        const content = blocks[tab.tag];

        // Special renderers for specific block types
        if (tab.tag === "CONFIDENCE") {
          return (
            <div key={tab.id} className="pt-5">
              <ConfidencePanel content={content} />
            </div>
          );
        }
        if (tab.tag === "VALIDATION" || tab.tag === "VALIDATION_CHECKLIST") {
          return (
            <div key={tab.id} className="pt-5">
              <ChecklistPanel content={content} />
            </div>
          );
        }

        return (
          <div key={tab.id} className="pt-5">
            <BlockContent content={content} />
          </div>
        );
      })}
    </div>
  );
}
