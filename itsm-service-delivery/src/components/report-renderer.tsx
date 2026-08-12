"use client";

import { useEffect, useMemo, useState } from "react";
import {
  extractAllBlocks,
  groupPoints,
  normalizeReportHtml,
  parseChecklist,
  parseConfidence,
  reportPointId,
  FLAG_STYLES,
  type FlagToken,
  type ParsedLine,
  type PointGroup,
  type ReportReviewState,
  type ReviewDecision,
  type ReportTab,
} from "@/lib/report-output";

type ReportRendererProps = {
  rawText: string;
  tabs: ReportTab[];
  reviewState?: ReportReviewState;
  onReviewStateChange?: (state: ReportReviewState) => void;
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
    if (/<(?:table|tr|td|th|h[1-6]|p|ul|ol|li|div)\b/i.test(line.text)) {
      return (
        <div
          className="text-justify text-sm leading-6 text-ink/80 [&_table]:w-full [&_table]:table-fixed [&_th]:bg-slate-100"
          dangerouslySetInnerHTML={{ __html: normalizeReportHtml(line.text) }}
        />
      );
    }
    return <p className="text-justify text-sm leading-6 text-ink/80">{line.text}</p>;
  }

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 pt-0.5"><FlagBadge flag={line.flag} /></div>
      <p className="min-w-0 flex-1 text-justify text-sm leading-6 text-ink/90">{line.text}</p>
    </div>
  );
}

function DecisionButton({
  value,
  active,
  onClick,
}: {
  value: ReviewDecision;
  active: boolean;
  onClick: () => void;
}) {
  const styles: Record<ReviewDecision, string> = {
    valid: active ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-white text-slate-500 hover:bg-emerald-50",
    invalid: active ? "border-rose-500 bg-rose-100 text-rose-800" : "border-slate-200 bg-white text-slate-500 hover:bg-rose-50",
    ignore: active ? "border-slate-500 bg-slate-200 text-slate-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100",
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${styles[value]}`}>
      {value}
    </button>
  );
}

function ReviewControls({
  itemId,
  reviewState,
  onReviewStateChange,
}: {
  itemId: string;
  reviewState: ReportReviewState;
  onReviewStateChange: (state: ReportReviewState) => void;
}) {
  const [draft, setDraft] = useState("");
  const item = reviewState[itemId] ?? { comments: [] };

  function setDecision(decision: ReviewDecision) {
    onReviewStateChange({
      ...reviewState,
      [itemId]: {
        ...item,
        decision: item.decision === decision ? undefined : decision,
        comments: item.comments ?? [],
      },
    });
  }

  function addComment() {
    const text = draft.trim();
    if (!text) return;
    onReviewStateChange({
      ...reviewState,
      [itemId]: {
        ...item,
        comments: [
          ...(item.comments ?? []),
          {
            id: crypto.randomUUID(),
            author: "ITSM Reviewer",
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    setDraft("");
  }

  function removeComment(commentId: string) {
    onReviewStateChange({
      ...reviewState,
      [itemId]: {
        ...item,
        comments: (item.comments ?? []).filter((comment) => comment.id !== commentId),
      },
    });
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">ITSM validation</span>
        {(["valid", "invalid", "ignore"] as ReviewDecision[]).map((decision) => (
          <DecisionButton key={decision} value={decision} active={item.decision === decision} onClick={() => setDecision(decision)} />
        ))}
      </div>

      {(item.comments ?? []).length > 0 && (
        <div className="mt-3 space-y-2">
          {item.comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-violet-100 bg-violet-50 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">{comment.author}</span>
                <button type="button" onClick={() => removeComment(comment.id)} className="text-xs text-slate-400 hover:text-rose-600">Remove</button>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-700">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              addComment();
            }
          }}
          placeholder="Add an ITSM reviewer comment…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-400"
        />
        <button type="button" onClick={addComment} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800">
          Comment
        </button>
      </div>
    </div>
  );
}

function PointGroupCard({
  group,
  itemId,
  reviewState,
  onReviewStateChange,
}: {
  group: PointGroup;
  itemId: string;
  reviewState: ReportReviewState;
  onReviewStateChange: (state: ReportReviewState) => void;
}) {
  const item = reviewState[itemId];
  const [primary, ...tied] = group.lines;
  const borderColor = primary.flag ? FLAG_STYLES[primary.flag].border : "border-slate-200";
  const stateStyle = item?.decision === "invalid"
    ? "bg-rose-50/60 opacity-80"
    : item?.decision === "ignore"
      ? "bg-slate-100/70 opacity-60"
      : item?.decision === "valid"
        ? "bg-emerald-50/40"
        : "bg-white";

  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 ${borderColor} ${stateStyle} p-3 transition`}>
      <FlaggedLine line={primary} />
      {tied.length > 0 && (
        <div className="mt-2 ml-2 space-y-2 border-l-2 border-slate-200 pl-3">
          {tied.map((line, index) => <FlaggedLine key={index} line={line} />)}
        </div>
      )}
      <ReviewControls itemId={itemId} reviewState={reviewState} onReviewStateChange={onReviewStateChange} />
    </div>
  );
}

function ChecklistPanel({ content }: { content: string }) {
  const items = parseChecklist(content);
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className={`flex items-start gap-3 rounded-xl border p-3 ${item.met ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <span className={`shrink-0 text-lg ${item.met ? "text-emerald-600" : "text-amber-600"}`}>{item.met ? "✓" : "⚠"}</span>
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
  if (!rating) return <BlockContent content={content} tag="CONFIDENCE" reviewState={{}} onReviewStateChange={() => undefined} />;
  const colors = {
    High: "border-emerald-300 bg-emerald-100 text-emerald-800",
    Medium: "border-amber-300 bg-amber-100 text-amber-800",
    Low: "border-rose-300 bg-rose-100 text-rose-800",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[rating.level]}`}>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white/60 px-3 py-1 text-sm font-bold">{rating.level}</span>
        <span className="text-sm font-bold text-ink">Confidence Assessment</span>
      </div>
      {rating.justification && <p className="mt-3 text-justify text-sm leading-6 text-ink/80">{rating.justification}</p>}
    </div>
  );
}

function BlockContent({
  content,
  tag,
  reviewState,
  onReviewStateChange,
}: {
  content: string;
  tag: string;
  reviewState: ReportReviewState;
  onReviewStateChange: (state: ReportReviewState) => void;
}) {
  const hasFlags = /\b(?:EVIDENCE|OBSERVATION|ASSUMPTION|QUESTION|RISK|BREACH|ACTION|COMPLIANT|UNKNOWN|ISSUE|RECOMMENDATION)\b/i.test(content);

  if (hasFlags) {
    const groups = groupPoints(content);
    return (
      <div className="space-y-3">
        {groups.map((group, index) => (
          <PointGroupCard
            key={reportPointId(tag, index)}
            group={group}
            itemId={reportPointId(tag, index)}
            reviewState={reviewState}
            onReviewStateChange={onReviewStateChange}
          />
        ))}
      </div>
    );
  }

  const hasHtml = /<(?:table|tr|td|th|h[1-6]|p|ul|ol|li|div)\b/i.test(content);
  if (hasHtml || normalizeReportHtml(content) !== content) {
    return (
      <div
        className="prose prose-sm max-w-none text-justify [&_table]:w-full [&_table]:table-fixed [&_th]:bg-slate-100 [&_td]:break-words [&_th]:break-words"
        dangerouslySetInnerHTML={{ __html: normalizeReportHtml(content) }}
      />
    );
  }

  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap text-justify text-sm leading-6 text-ink/80">{paragraph}</p>
      ))}
    </div>
  );
}

export function ReportRenderer({
  rawText,
  tabs,
  reviewState = {},
  onReviewStateChange = () => undefined,
}: ReportRendererProps) {
  const blocks = useMemo(() => extractAllBlocks(rawText, tabs.map((tab) => tab.tag)), [rawText, tabs]);
  const populatedTabs = useMemo(() => tabs.filter((tab) => blocks[tab.tag]), [tabs, blocks]);
  const [activeTab, setActiveTab] = useState(populatedTabs[0]?.id ?? "");

  useEffect(() => {
    if (!populatedTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(populatedTabs[0]?.id ?? "");
    }
  }, [activeTab, populatedTabs]);

  if (populatedTabs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          The AI response did not use the expected tagged-block format. Displaying raw output.
        </div>
        <BlockContent content={rawText} tag="RAW" reviewState={reviewState} onReviewStateChange={onReviewStateChange} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {populatedTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${
              activeTab === tab.id ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {populatedTabs.map((tab) => {
        if (tab.id !== activeTab) return null;
        const content = blocks[tab.tag];
        if (tab.tag === "CONFIDENCE") {
          return <div key={tab.id} className="pt-5"><ConfidencePanel content={content} /></div>;
        }
        if (tab.tag === "VALIDATION" || tab.tag === "VALIDATION_CHECKLIST") {
          return <div key={tab.id} className="pt-5"><ChecklistPanel content={content} /></div>;
        }
        return (
          <div key={tab.id} className="pt-5">
            <BlockContent
              content={content}
              tag={tab.tag}
              reviewState={reviewState}
              onReviewStateChange={onReviewStateChange}
            />
          </div>
        );
      })}
    </div>
  );
}
