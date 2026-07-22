"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredGuideline } from "@/lib/guidelines-store";

type GuidelinesManagerProps = {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  compact?: boolean;
};

export function GuidelinesManager({
  selectedIds,
  onSelectionChange,
  compact = false,
}: GuidelinesManagerProps) {
  const [guidelines, setGuidelines] = useState<StoredGuideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGuidelines = useCallback(async () => {
    try {
      const response = await fetch("/api/guidelines");
      const data = (await response.json()) as { ok: boolean; guidelines: StoredGuideline[] };
      if (data.ok) setGuidelines(data.guidelines);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  function toggleSelection(id: string) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  }

  async function postUploadAction<T>(body: Record<string, unknown>): Promise<T> {
    const response = await fetch("/api/guidelines/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload: { ok?: boolean; error?: string } & Partial<T>;
    try {
      payload = JSON.parse(text) as { ok?: boolean; error?: string } & Partial<T>;
    } catch {
      throw new Error(
        `Upload service returned ${response.status} instead of JSON. Check the latest Vercel function logs and confirm DATABASE_URL is configured.`,
      );
    }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Upload failed with status ${response.status}.`);
    }
    return payload as T;
  }

  async function handleUpload() {
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.length) {
      setError("Select a file first.");
      return;
    }
    if (!uploadName.trim()) {
      setError("Give this guideline a name.");
      return;
    }

    const file = fileInput.files[0];
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const allowed = ["xml", "docx", "pdf", "txt", "md", "markdown"];
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type (.${ext}). Use XML, DOCX, PDF, TXT, or MD.`);
      return;
    }
    if (file.size > 12_000_000) {
      setError("File exceeds the 12 MB guideline limit.");
      return;
    }

    const chunkBytes = 500_000;
    const totalChunks = Math.ceil(file.size / chunkBytes);
    let uploadId: string | null = null;
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const init = await postUploadAction<{ ok: true; uploadId: string }>({
        action: "init",
        fileSize: file.size,
        totalChunks,
      });
      uploadId = init.uploadId;

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkBytes;
        const end = Math.min(file.size, start + chunkBytes);
        const buffer = await file.slice(start, end).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const conversionChunk = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += conversionChunk) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + conversionChunk));
        }
        await postUploadAction<{ ok: true }>({
          action: "chunk",
          uploadId,
          index,
          totalChunks,
          contentBase64: btoa(binary),
        });
        setUploadProgress(Math.round(((index + 1) / (totalChunks + 1)) * 100));
      }

      const completed = await postUploadAction<{
        ok: true;
        guideline: StoredGuideline;
        extraction: { kind: string; characters: number; wordCount: number; warnings: string[] };
      }>({
        action: "complete",
        uploadId,
        totalChunks,
        name: uploadName,
        description: uploadDescription || undefined,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      setUploadProgress(100);
      await fetchGuidelines();
      setShowUpload(false);
      setUploadName("");
      setUploadDescription("");
      fileInput.value = "";
      onSelectionChange([...selectedIds, completed.guideline.id]);
    } catch (e) {
      if (uploadId) {
        void postUploadAction({ action: "cancel", uploadId }).catch(() => undefined);
      }
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete guideline "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/guidelines?id=${id}`, { method: "DELETE" });
      await fetchGuidelines();
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } catch {
      // ignore
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
            Saved Guidelines ({guidelines.length})
          </span>
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="font-mono text-[10px] font-bold text-pine hover:underline"
          >
            {showUpload ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showUpload && (
          <div className="rounded-xl border border-line bg-white p-3 space-y-2">
            <input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Guideline name (e.g. 'Major Incident SOP')"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <input
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.docx,.pdf,.txt,.md,.markdown,text/xml,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="w-full text-xs text-ink/60"
            />
            <p className="text-[10px] text-ink/40">XML · DOCX · PDF · TXT · MD — up to 12 MB</p>
            {uploading && (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-right font-mono text-[10px] text-ink/45">{uploadProgress}%</p>
              </div>
            )}
            {error && <p className="rounded-lg bg-rose-50 p-2 text-xs leading-5 text-rose-700">{error}</p>}
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded-lg bg-pine px-3 py-2 text-xs font-bold text-paper hover:bg-pine-soft disabled:opacity-50"
            >
              {uploading ? `Uploading ${uploadProgress}%` : "Store Guideline"}
            </button>
          </div>
        )}

        {guidelines.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
            No saved guidelines yet. Upload one to reuse across analyses.
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {guidelines.map((g) => {
              const selected = selectedIds.includes(g.id);
              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                    selected ? "border-pine bg-pine/5" : "border-line bg-white hover:border-pine/40"
                  }`}
                  onClick={() => toggleSelection(g.id)}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {}}
                    className="size-4 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{g.name}</p>
                    <p className="truncate text-[10px] text-ink/45">
                      {g.originalFilename} · {g.wordCount ?? 0} words · used {g.useCount ?? 0}x
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(g.id, g.name); }}
                    className="rounded-full px-2 py-1 text-lg leading-none text-ink/20 hover:text-rose-500"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full view for settings page
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
          Saved Guidelines ({guidelines.length})
        </span>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-full bg-pine px-4 py-2 font-mono text-[11px] font-bold text-paper hover:bg-pine-soft"
        >
          {showUpload ? "Cancel" : "+ New Guideline"}
        </button>
      </div>

      {showUpload && (
        <div className="rounded-2xl border border-line bg-white p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Name
              </label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. 'Major Incident Review SOP'"
                className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Description (optional)
              </label>
              <input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="When to use this guideline"
                className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
              File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.docx,.pdf,.txt,.md,.markdown,text/xml,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="mt-2 w-full text-sm text-ink/60"
            />
            <p className="mt-1 text-[10px] text-ink/40">XML · DOCX · PDF · TXT · MD — up to 12 MB</p>
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-right font-mono text-[10px] text-ink/45">{uploadProgress}%</p>
            </div>
          )}
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm leading-5 text-rose-700">{error}</p>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-xl bg-pine px-6 py-3 font-display text-sm font-bold text-paper hover:bg-pine-soft disabled:opacity-50"
          >
            {uploading ? `Uploading ${uploadProgress}%` : "Store Guideline"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <span className="font-mono text-sm text-ink/50">Loading guidelines…</span>
        </div>
      ) : guidelines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <p className="text-ink/60">No saved guidelines yet.</p>
          <p className="mt-1 text-sm text-ink/40">
            Upload a guideline once and reuse it across all future analyses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {guidelines.map((g) => (
            <div key={g.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{g.name}</p>
                {g.description && (
                  <p className="mt-0.5 text-sm text-ink/60">{g.description}</p>
                )}
                <p className="mt-1 font-mono text-[10px] text-ink/40">
                  {g.originalFilename} · {formatBytes(g.fileSizeBytes)} · {g.wordCount ?? 0} words · used {g.useCount ?? 0}×
                  {g.lastUsedAt && <> · last {new Date(g.lastUsedAt).toLocaleDateString()}</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(g.id, g.name)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-mono text-[11px] font-bold text-rose-600 hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
