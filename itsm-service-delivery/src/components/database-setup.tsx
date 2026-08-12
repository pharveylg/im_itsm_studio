"use client";

import { useEffect, useState } from "react";

type TableStatus = {
  name: string;
  exists: boolean;
  created: boolean;
  error?: string;
};

type SetupResponse = {
  ok: boolean;
  database: string;
  identity?: {
    provider: "local" | "supabase" | "managed" | "unknown";
    label: string;
    database: string;
    fingerprint: string;
  };
  guidelineCount?: number;
  tables: TableStatus[];
  message: string;
};

export function DatabaseSetup() {
  const [status, setStatus] = useState<SetupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkStatus() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/setup");
      const data = (await response.json()) as SetupResponse;
      setStatus(data);
      if (!data.ok) {
        setError(data.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach the setup endpoint.");
    } finally {
      setLoading(false);
    }
  }

  async function bootstrap() {
    setBootstrapping(true);
    setError(null);
    try {
      const response = await fetch("/api/setup", { method: "POST" });
      const data = (await response.json()) as SetupResponse;
      setStatus(data);
      if (!data.ok) {
        setError(data.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bootstrap failed.");
    } finally {
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    void checkStatus();
  }, []);

  const tableNames: Record<string, string> = {
    connection_config: "ServiceNow Connection",
    ai_provider_configs: "AI Provider Configs",
    stored_guidelines: "Stored Guidelines",
    github_config: "GitHub Sync Config",
    guideline_upload_chunks: "Upload Temp Storage",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 text-sm text-ink/50">
        Checking database connection…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status?.database === "connected" && status.identity && (
        <div className={`rounded-xl border p-3 text-xs ${
          status.identity.provider === "local"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          <p className="font-bold">
            Active data source: {status.identity.label} · {status.identity.database}
          </p>
          <p className="mt-1 leading-5">
            {status.guidelineCount ?? 0} stored guideline{(status.guidelineCount ?? 0) === 1 ? "" : "s"} · connection fingerprint {status.identity.fingerprint}
          </p>
          {status.identity.provider === "local" && (
            <p className="mt-2 font-semibold leading-5">
              This is a local database. It is separate from your Vercel/Supabase deployment and will not contain the deployment&apos;s guidelines unless DATABASE_URL is changed to the same Supabase connection.
            </p>
          )}
        </div>
      )}

      {status?.tables && (
        <div className="grid grid-cols-2 gap-2">
          {status.tables.map((table) => (
            <div
              key={table.name}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-[11px] font-mono ${
                table.exists || table.created
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : table.error
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <span className={`size-2 shrink-0 rounded-full ${table.exists || table.created ? "bg-emerald-500" : table.error ? "bg-rose-500" : "bg-amber-500"}`} />
              <span className="truncate">{tableNames[table.name] || table.name}</span>
              {table.created && <span className="text-emerald-600">✓ created</span>}
              {table.exists && <span className="text-emerald-600">✓</span>}
              {table.error && <span className="truncate text-rose-600">✗ {table.error}</span>}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={bootstrap}
          disabled={bootstrapping}
          className="rounded-lg bg-pine px-4 py-2 font-mono text-[11px] font-bold text-paper hover:bg-pine-soft disabled:opacity-50"
        >
          {bootstrapping ? "Bootstrapping…" : "Create Missing Tables"}
        </button>
        <button
          type="button"
          onClick={checkStatus}
          className="rounded-lg border border-line bg-white px-4 py-2 font-mono text-[11px] font-bold text-ink/70 hover:bg-mist"
        >
          Refresh
        </button>
      </div>

      <p className="text-[10px] leading-4 text-ink/40">
        This creates tables automatically. For a clean setup, you can also run <code className="rounded bg-slate-100 px-1">npx drizzle-kit push</code> from the command line.
      </p>
    </div>
  );
}
