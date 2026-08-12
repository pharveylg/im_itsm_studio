"use client";

import { useEffect, useState } from "react";

type GithubConfig = {
  owner: string;
  repo: string;
  branch: string;
  hasPat: boolean;
  updatedAt: string | null;
};

type SyncResult = {
  ok: boolean;
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  error?: string;
  logs: string[];
};

export function GithubSyncConsole() {
  const [config, setConfig] = useState<GithubConfig>({ owner: "", repo: "", branch: "main", hasPat: false, updatedAt: null });
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/github/config");
      const data = await res.json();
      if (data.ok) {
        setConfig({
          owner: data.owner,
          repo: data.repo,
          branch: data.branch || "main",
          hasPat: data.hasPat,
          updatedAt: data.updatedAt,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/github/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          pat: pat || undefined,
          keepPat: !pat && config.hasPat,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "Configuration saved successfully." });
        setPat("");
        await fetchConfig();
      } else {
        throw new Error(data.error || "Failed to save configuration.");
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error saving configuration." });
    } finally {
      setSaving(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    setMessage({ type: "info", text: "Sync in progress... This may take a moment." });
    setLogs([]);
    try {
      const res = await fetch("/api/github/sync", { method: "POST" });
      const data = await res.json() as SyncResult;
      
      setLogs(data.logs || []);
      
      if (data.ok) {
        setMessage({ 
          type: "success", 
          text: `Sync complete! Added: ${data.added}, Updated: ${data.updated}, Removed: ${data.removed}, Unchanged: ${data.skipped}` 
        });
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error connecting to sync endpoint." });
    } finally {
      setSyncing(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(24,39,32,0.05)] transition-colors focus:border-leaf-deep";

  if (loading) {
    return <div className="p-6 text-sm text-ink/60">Loading configuration...</div>;
  }

  const isConfigured = config.owner && config.repo && config.hasPat;

  return (
    <div className="space-y-6 rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(17,52,44,0.35)] sm:p-8">
      
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">GitHub Repository Sync</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-ink/60">
            Automatically pull governance documents (XML, DOCX, PDF, MD, TXT) from your repository into the application's guidelines database.
          </p>
        </div>
        
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-mist/20 px-4 py-3 shadow-sm">
          <div className="text-right">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Sync Status
            </p>
            <p className={`mt-1 font-display text-base font-bold ${isConfigured ? "text-leaf-deep" : "text-amber-600"}`}>
              {isConfigured ? "Ready to Sync" : "Not Configured"}
            </p>
          </div>
          <span className={`size-3 rounded-full ${isConfigured ? "bg-leaf dot-live" : "bg-ember"}`} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
            Repository Owner
          </label>
          <input
            value={config.owner}
            onChange={(e) => setConfig({ ...config, owner: e.target.value })}
            placeholder="e.g. microsoft or my-org"
            className={`${inputCls} mt-2`}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
            Repository Name
          </label>
          <input
            value={config.repo}
            onChange={(e) => setConfig({ ...config, repo: e.target.value })}
            placeholder="e.g. governance-docs"
            className={`${inputCls} mt-2`}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
            Branch
          </label>
          <input
            value={config.branch}
            onChange={(e) => setConfig({ ...config, branch: e.target.value })}
            placeholder="main"
            className={`${inputCls} mt-2`}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
            Personal Access Token (PAT)
          </label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder={config.hasPat ? "•••••••••••••••••••••••••••• (saved, enter new to change)" : "ghp_..."}
            className={`${inputCls} mt-2`}
          />
          <p className="mt-2 text-[11px] text-ink/50">
            Use a <strong>Fine-grained Personal Access Token</strong> scoped only to this repository with <strong>Read-only</strong> access to Contents.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="button"
          onClick={saveConfig}
          disabled={saving || !config.owner || !config.repo || (!pat && !config.hasPat)}
          className="rounded-xl border border-line bg-white px-5 py-2.5 font-display text-sm font-bold text-ink shadow-sm transition-colors hover:bg-mist disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>

        <button
          type="button"
          onClick={triggerSync}
          disabled={syncing || !isConfigured}
          className="flex items-center gap-2 rounded-xl bg-pine px-6 py-2.5 font-display text-sm font-bold text-paper shadow-lg shadow-pine/25 transition-all hover:-translate-y-0.5 hover:bg-pine-soft disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {syncing ? (
            <>
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            "Run Sync Now"
          )}
        </button>
      </div>

      {message && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${
          message.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" :
          message.type === "error" ? "border border-rose-200 bg-rose-50 text-rose-800" :
          "border border-sky-200 bg-sky-50 text-sky-800"
        }`}>
          {message.text}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 border-t border-line pt-6">
          <button 
            onClick={() => setShowLogs(!showLogs)} 
            className="font-mono text-xs font-bold text-ink/60 hover:text-ink"
          >
            {showLogs ? "Hide Sync Logs" : "Show Sync Logs"}
          </button>
          {showLogs && (
            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] leading-5 text-emerald-300">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
