"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ARTICLE_TYPES,
  CATEGORIES,
  KB_BASES,
  type KnowledgeArticleInput,
  type KnowledgeArticleOutput,
  generateImageChecklist,
} from "@/lib/knowledge-authoring";
import { wrapForServiceNow } from "@/lib/knowledge-authoring";

type StyleGuideFile = {
  id: string;
  name: string;
  contentType: string;
  encoding: "utf8" | "base64";
  content: string;
  bytes: number;
  kind: "xml" | "docx" | "pdf" | "text";
};

type SourceXmlFile = {
  id: string;
  name: string;
  xml: string;
  bytes: number;
};

type AiProviderOption = {
  key: string;
  name: string;
  model: string;
  enabled: boolean;
};

type KnowledgeResponse = {
  ok: boolean;
  configured?: boolean;
  error?: string;
  article?: KnowledgeArticleOutput & { bodyHtml?: string };
  provider?: string;
  model?: string;
  latencyMs?: number;
  analyzedAt?: string;
};

type OutputTab = "preview" | "html" | "snow";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function detectGuidelineKind(file: File): StyleGuideFile["kind"] | null {
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
    case "pdf": return "PDF";
    case "docx": return "DOCX";
    case "xml": return "XML";
    case "text": return "TEXT";
    default: return kind.toUpperCase();
  }
}

export function KnowledgeAuthorConsole() {
  // Article metadata
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [articleType, setArticleType] = useState<KnowledgeArticleInput["articleType"]>("kb_knowledge");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [kbBase, setKbBase] = useState<string>(KB_BASES[0]);
  const [audience, setAudience] = useState("IT Support");

  // Style guide
  const [styleGuideFiles, setStyleGuideFiles] = useState<StyleGuideFile[]>([]);
  const [styleGuideText, setStyleGuideText] = useState("");

  // Source material (optional XML extracts)
  const [sourceFiles, setSourceFiles] = useState<SourceXmlFile[]>([]);

  // AI provider
  const [providers, setProviders] = useState<AiProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("default");

  // Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<KnowledgeResponse | null>(null);
  const [copied, setCopied] = useState<string>("");
  const [outputTab, setOutputTab] = useState<OutputTab>("preview");

  const styleGuideInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  // Fetch available providers
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-providers");
      const data = (await response.json()) as { providers: AiProviderOption[] };
      const enabled = data.providers.filter((p) => p.enabled);
      setProviders(enabled);
      if (enabled.length > 0 && selectedProvider === "default") {
        setSelectedProvider(enabled[0].key);
      }
    } catch {
      // ignore
    }
  }, [selectedProvider]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // File handlers
  async function addStyleGuideFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
      .map((file) => ({ file, kind: detectGuidelineKind(file) }))
      .filter((entry): entry is { file: File; kind: StyleGuideFile["kind"] } => Boolean(entry.kind));

    const loaded = await Promise.all(incoming.slice(0, 4).map(async ({ file, kind }) => {
      const isBinary = kind === "pdf" || kind === "docx";
      const content = isBinary
        ? arrayBufferToBase64(await file.arrayBuffer())
        : await file.text();
      return {
        id: `sg-${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        contentType: file.type,
        encoding: isBinary ? "base64" as const : "utf8" as const,
        content,
        bytes: file.size,
        kind,
      };
    }));

    setStyleGuideFiles((current) => [...current, ...loaded].slice(0, 4));
    setResult(null);
  }

  async function addSourceFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) =>
      file.name.toLowerCase().endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml"
    );
    const loaded = await Promise.all(incoming.slice(0, 6).map(async (file) => ({
      id: `src-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      xml: await file.text(),
      bytes: file.size,
    })));
    setSourceFiles((current) => [...current, ...loaded].slice(0, 6));
    setResult(null);
  }

  function removeStyleGuideFile(id: string) {
    setStyleGuideFiles((current) => current.filter((f) => f.id !== id));
    setResult(null);
  }

  function removeSourceFile(id: string) {
    setSourceFiles((current) => current.filter((f) => f.id !== id));
    setResult(null);
  }

  // Generate article
  async function generate() {
    if (!title.trim() || !summary.trim()) {
      setResult({ ok: false, error: "Title and summary are required." });
      return;
    }
    if (!styleGuideFiles.length && !styleGuideText.trim()) {
      setResult({ ok: false, error: "Add a style guide document or freeform style instructions." });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            title,
            summary,
            articleType,
            category,
            kbBase,
            audience,
          },
          styleGuideDocuments: styleGuideFiles.map(({ name, contentType, encoding, content }) => ({
            name,
            contentType,
            encoding,
            content,
          })),
          styleGuideText,
          sourceDocuments: sourceFiles.map(({ name, xml }) => ({ name, xml })),
          provider: selectedProvider === "default" ? undefined : selectedProvider,
        }),
      });

      const responseText = await response.text();
      let payload: KnowledgeResponse;
      try {
        payload = JSON.parse(responseText) as KnowledgeResponse;
      } catch {
        payload = {
          ok: false,
          error: response.status === 504 || /timed?\s*out|timeout/i.test(responseText)
            ? `Article generation timed out on the server (status ${response.status}). Try a shorter style guide, fewer source documents, or a faster model.`
            : `The service returned status ${response.status} instead of JSON. Check the Vercel function logs for /api/knowledge. First bytes: ${responseText.slice(0, 120)}`,
        };
      }
      setResult(payload);
      if (payload.ok) setOutputTab("preview");
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Unable to generate article." });
    } finally {
      setIsGenerating(false);
    }
  }

  // Copy handlers
  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  const snowReadyHtml = useMemo(() => {
    if (!result?.article) return "";
    return wrapForServiceNow(result.article);
  }, [result?.article]);

  const canGenerate = title.trim() && summary.trim() && (styleGuideFiles.length > 0 || styleGuideText.trim()) && providers.length > 0;

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(24,39,32,0.05)] transition-colors focus:border-leaf-deep";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-pine px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                Knowledge Authoring
              </span>
              <span className="rounded-full border border-leaf/50 bg-leaf-soft px-3 py-1 text-xs font-bold text-leaf-deep">
                ServiceNow-Ready Output
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-ink sm:text-5xl">
              Author knowledge articles, publish-ready
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-ink/70">
              Define the article, upload your style guide, optionally feed in source records, and
              get back clean HTML you can paste directly into ServiceNow&apos;s KB editor.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[460px_minmax(0,1fr)]">
        {/* Left column: inputs */}
        <div className="space-y-6">
          {/* Article metadata */}
          <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
            <h2 className="font-display text-lg font-bold text-ink">Article Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. How to reset a locked Active Directory account"
                  className={`${inputCls} mt-2`}
                />
              </div>
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  Summary (search result text)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="One to two sentences describing what this article covers and who it's for."
                  className={`${inputCls} mt-2 resize-y`}
                />
              </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                     Article Type
                   </label>
                   <select
                     value={articleType}
                     onChange={(e) => setArticleType(e.target.value as KnowledgeArticleInput["articleType"])}
                     className={`${inputCls} mt-2`}
                   >
                     {ARTICLE_TYPES.map((t) => (
                       <option key={t.value} value={t.value}>{t.label}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                     Category
                   </label>
                   <select
                     value={category}
                     onChange={(e) => setCategory(e.target.value as string)}
                     className={`${inputCls} mt-2`}
                   >
                     {CATEGORIES.map((c) => (
                       <option key={c} value={c}>{c}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                     Knowledge Base
                   </label>
                   <select
                     value={kbBase}
                     onChange={(e) => setKbBase(e.target.value as string)}
                     className={`${inputCls} mt-2`}
                   >
                     {KB_BASES.map((kb) => (
                       <option key={kb} value={kb}>{kb}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                     Audience
                   </label>
                   <input
                     value={audience}
                     onChange={(e) => setAudience(e.target.value)}
                     placeholder="e.g. IT Support, End Users"
                     className={`${inputCls} mt-2`}
                   />
                 </div>
               </div>
               <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                 <span className="font-bold">AI can override these.</span> After generation, review suggested metadata changes below the output.
               </div>
            </div>
          </section>

          {/* Style guide */}
          <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
            <h2 className="font-display text-lg font-bold text-ink">Style Guide</h2>
            <p className="mt-1 text-[13px] text-ink/55">
              Upload your formatting standards as XML, DOCX, PDF, or plain text.
            </p>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-line p-5 text-center">
              <p className="font-bold text-ink">Drop style guide files here</p>
              <p className="mt-1 text-xs text-ink/50">XML · DOCX · PDF · TXT · MD</p>
              <button
                type="button"
                onClick={() => styleGuideInputRef.current?.click()}
                className="mt-3 rounded-full bg-pine px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-paper hover:bg-pine-soft"
              >
                Browse Files
              </button>
              <input
                ref={styleGuideInputRef}
                type="file"
                accept=".xml,.docx,.pdf,.txt,.md,.markdown,text/xml,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
                onChange={(e) => { if (e.target.files) void addStyleGuideFiles(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
            </div>

            {styleGuideFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {styleGuideFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[10px] font-black text-violet-800">
                      {kindBadge(file.kind)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeStyleGuideFile(file.id)}
                      className="rounded-full px-2 py-1 text-lg leading-none text-ink/30 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Additional style notes (optional)
              </label>
              <textarea
                value={styleGuideText}
                onChange={(e) => setStyleGuideText(e.target.value)}
                rows={4}
                placeholder="e.g. Always include a 'Verification' step. Use 'Configuration item' not 'CI'. Brand voice: professional but approachable."
                className={`${inputCls} mt-2 resize-y`}
              />
            </div>
          </section>

          {/* Source material (optional) */}
          <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
            <h2 className="font-display text-lg font-bold text-ink">Source Material (Optional)</h2>
            <p className="mt-1 text-[13px] text-ink/55">
              Feed in related incident, problem, or change XML to ground the article.
            </p>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-line p-4 text-center">
              <button
                type="button"
                onClick={() => sourceInputRef.current?.click()}
                className="rounded-full border border-pine/30 bg-white px-4 py-2 text-xs font-bold text-pine hover:bg-pine hover:text-paper"
              >
                Add XML Extracts
              </button>
              <input
                ref={sourceInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                multiple
                onChange={(e) => { if (e.target.files) void addSourceFiles(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
            </div>

            {sourceFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {sourceFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[10px] font-black text-amber-800">XML</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSourceFile(file.id)}
                      className="rounded-full px-2 py-1 text-lg leading-none text-ink/30 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Provider selector + generate */}
          <section className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Analysis Engine</h2>
              <a href="/settings" className="font-mono text-[11px] font-bold text-pine hover:underline">
                Manage providers →
              </a>
            </div>
            {providers.length === 0 ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                No providers configured. <a href="/settings" className="font-bold underline">Add one in Settings</a>.
              </div>
            ) : (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={`${inputCls} mt-3`}
              >
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} ({p.model})</option>
                ))}
                <option value="default">System default</option>
              </select>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={isGenerating || !canGenerate}
              className="mt-5 w-full rounded-xl bg-pine px-5 py-4 font-display text-sm font-bold uppercase tracking-[0.16em] text-paper shadow-lg shadow-pine/25 transition-all hover:-translate-y-0.5 hover:bg-pine-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Authoring…" : "Generate Article"}
            </button>
          </section>
        </div>

        {/* Right column: output */}
        <div className="space-y-6">
          {result?.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
              <h2 className="font-bold">Generation failed</h2>
              <p className="mt-2 text-sm">{result.error}</p>
              {result.configured === false && (
                <p className="mt-3 rounded-lg bg-white/70 p-3 font-mono text-xs">
                  Configure an AI provider in Settings first.
                </p>
              )}
            </div>
          )}

          {result?.article ? (
            <div className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex gap-2">
                  {(["preview", "html", "snow"] as OutputTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setOutputTab(tab)}
                      className={`rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                        outputTab === tab
                          ? "bg-pine text-paper"
                          : "bg-slate-100 text-ink/60 hover:bg-slate-200"
                      }`}
                    >
                      {tab === "snow" ? "ServiceNow" : tab}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(outputTab === "preview" ? result.article!.body : outputTab === "html" ? result.article!.body : snowReadyHtml, "article")}
                    className="rounded-full border border-pine/30 bg-white px-4 py-1.5 font-mono text-[11px] font-bold text-pine hover:bg-pine hover:text-paper"
                  >
                    {copied === "article" ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Meta info */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink/50">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{result.provider}</span>
                <span>{result.model}</span>
                <span>·</span>
                <span>{result.latencyMs}ms</span>
              </div>

              {/* Output panels */}
              <div className="mt-5">
                {outputTab === "preview" && (
                  <div
                    className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-white p-6"
                    dangerouslySetInnerHTML={{ __html: result.article.body }}
                  />
                )}
                {outputTab === "html" && (
                  <div className="relative">
                    <pre className="max-h-[600px] overflow-auto rounded-xl bg-slate-900 p-5 font-mono text-xs leading-5 text-emerald-300">
                      <code>{result.article.body}</code>
                    </pre>
                  </div>
                )}
                {outputTab === "snow" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <span className="font-bold">Ready to paste into ServiceNow.</span> Copy the HTML
                      below and paste it into the KB article&apos;s HTML field.
                    </div>
                    <pre className="max-h-[600px] overflow-auto rounded-xl bg-slate-900 p-5 font-mono text-xs leading-5 text-emerald-300">
                      <code>{snowReadyHtml}</code>
                    </pre>
                  </div>
                )}
              </div>

               {/* AI-Suggested Metadata Overrides */}
               {result.article.suggestedMetadata && (
                 <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                   <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                     AI-Suggested Overrides
                   </p>
                   <p className="mt-1 text-xs text-amber-600">Click to apply these suggestions to your article.</p>
                   <div className="mt-3 space-y-2">
                     {result.article?.suggestedMetadata?.articleType && result.article.suggestedMetadata.articleType !== result.article.metadata.articleType && (
                       <div className="flex items-center justify-between rounded-lg bg-white p-2">
                         <span className="text-xs"><span className="font-semibold">Type:</span> {result.article.suggestedMetadata.articleType}</span>
                         <button
                           type="button"
                           onClick={() => setArticleType(result.article!.suggestedMetadata!.articleType as KnowledgeArticleInput["articleType"])}
                           className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-200"
                         >
                           Apply
                         </button>
                       </div>
                     )}
                     {result.article?.suggestedMetadata?.category && result.article.suggestedMetadata.category !== result.article.metadata.category && (
                       <div className="flex items-center justify-between rounded-lg bg-white p-2">
                         <span className="text-xs"><span className="font-semibold">Category:</span> {result.article.suggestedMetadata.category}</span>
                         <button
                           type="button"
                           onClick={() => setCategory(result.article!.suggestedMetadata!.category!)}
                           className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-200"
                         >
                           Apply
                         </button>
                       </div>
                     )}
                     {result.article?.suggestedMetadata?.kbBase && result.article.suggestedMetadata.kbBase !== result.article.metadata.kbBase && (
                       <div className="flex items-center justify-between rounded-lg bg-white p-2">
                         <span className="text-xs"><span className="font-semibold">KB:</span> {result.article.suggestedMetadata.kbBase}</span>
                         <button
                           type="button"
                           onClick={() => setKbBase(result.article!.suggestedMetadata!.kbBase!)}
                           className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-200"
                         >
                           Apply
                         </button>
                       </div>
                     )}
                     {result.article?.suggestedMetadata?.audience && result.article.suggestedMetadata.audience !== result.article.metadata.audience && (
                       <div className="flex items-center justify-between rounded-lg bg-white p-2">
                         <span className="text-xs"><span className="font-semibold">Audience:</span> {result.article.suggestedMetadata.audience}</span>
                         <button
                           type="button"
                           onClick={() => setAudience(result.article!.suggestedMetadata!.audience!)}
                           className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-200"
                         >
                           Apply
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               )}

               {/* Metadata */}
               <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                 <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">
                   Article Metadata
                 </p>
                 <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                   <div><span className="font-semibold">Type:</span> {result.article.metadata.articleType}</div>
                   <div><span className="font-semibold">Category:</span> {result.article.metadata.category}</div>
                   <div><span className="font-semibold">KB:</span> {result.article.metadata.kbBase}</div>
                   <div><span className="font-semibold">Audience:</span> {result.article.metadata.audience}</div>
                 </div>
                 {result.article.metadata.tags.length > 0 && (
                   <div className="mt-2 flex flex-wrap gap-1">
                     {result.article.metadata.tags.map((tag) => (
                       <span key={tag} className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-ink/60 ring-1 ring-slate-200">
                         {tag}
                       </span>
                     ))}
                   </div>
                 )}
               </div>

               {/* Image Placeholders */}
               {result.article.imagePlaceholders.length > 0 && (
                 <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                   <div className="flex items-center justify-between">
                     <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
                       Image Placeholders ({result.article.imagePlaceholders.length})
                     </p>
                     <button
                       type="button"
                       onClick={() => {
                         const checklist = generateImageChecklist(result.article!.imagePlaceholders);
                         copyToClipboard(checklist, "checklist");
                       }}
                       className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800 hover:bg-sky-200"
                     >
                       {copied === "checklist" ? "Copied ✓" : "Copy Checklist"}
                     </button>
                   </div>
                   <p className="mt-1 text-xs text-sky-600">
                     ServiceNow uses attachment-based images. Upload these as attachments after creating the article.
                   </p>
                   <div className="mt-3 space-y-2">
                     {result.article.imagePlaceholders.map((img, index) => (
                       <div key={img.id} className="rounded-lg bg-white p-3">
                         <div className="flex items-start gap-3">
                           <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700">
                             {index + 1}
                           </span>
                           <div className="min-w-0 flex-1">
                             <p className="text-xs font-semibold text-ink">
                               <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-700">
                                 {img.type}
                               </span>{" "}
                               {img.description}
                             </p>
                             <p className="mt-1 text-[11px] text-ink/60">
                               <span className="font-medium">Alt:</span> {img.altText}
                             </p>
                             {img.suggestedCaption && (
                               <p className="mt-0.5 text-[11px] text-ink/60">
                                 <span className="font-medium">Caption:</span> {img.suggestedCaption}
                               </p>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="mt-3 rounded-lg bg-white p-3 text-xs text-ink/70">
                     <p className="font-semibold text-ink">How to add images in ServiceNow:</p>
                     <ol className="mt-1 list-inside list-decimal space-y-0.5">
                       <li>Create the KB article and copy the HTML</li>
                       <li>Upload each image as an attachment to the article</li>
                       <li>Replace <code className="rounded bg-sky-100 px-1 text-[10px]">PENDING_...</code> with the actual sys_id</li>
                     </ol>
                   </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="grid min-h-[500px] place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-pine text-3xl text-paper">✎</div>
                <h2 className="mt-5 text-2xl font-black text-ink">Article preview appears here</h2>
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  Fill in the article details, upload your style guide, and click Generate. The
                  output will be formatted HTML ready for ServiceNow.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
