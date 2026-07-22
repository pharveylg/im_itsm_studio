"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AiProviderConfig,
  type AiProviderKey,
  PROVIDER_DEFAULTS,
  validateProviderConfig,
  getProviderDisplayName,
} from "@/lib/ai-providers";

type ProviderState = {
  key: AiProviderKey;
  tier: "cloud" | "local";
  localOnly?: boolean;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  model: string;
  hasKey: boolean;
};

type HealthStatus = {
  key: AiProviderKey;
  status: "healthy" | "degraded" | "unavailable";
  latencyMs: number;
  error?: string;
};

type Tab = "list" | "configure";

const PROVIDER_ORDER: AiProviderKey[] = [
  "openai",
  "anthropic",
  "azure-openai",
  "ollama",
  "generic",
];

const LOCAL_PROVIDER_NOTE =
  "Local providers only work when running this app on your own machine (e.g., `npm run dev` or `npm start`). They are unavailable on Vercel/Supabase deployments because serverless functions cannot reach localhost on your laptop.";

export function AiProviderConsole() {
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [health, setHealth] = useState<Partial<Record<AiProviderKey, HealthStatus>>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [selectedProvider, setSelectedProvider] = useState<AiProviderKey | null>(null);
  const [saveState, setSaveState] = useState<{ saving: boolean; error?: string; ok?: boolean }>({
    saving: false,
  });

  const [formConfig, setFormConfig] = useState<Partial<AiProviderConfig>>({});
  const [showSecret, setShowSecret] = useState(false);

  const fetchProviders = useCallback(async (withHealth = false) => {
    try {
      const url = withHealth ? "/api/ai-providers?health=true" : "/api/ai-providers";
      const response = await fetch(url);
      const data = (await response.json()) as {
        providers: ProviderState[];
        health?: HealthStatus[];
      };
      setProviders(data.providers);
      if (data.health) {
        setHealth(
          data.health.reduce((acc, h) => ({ ...acc, [h.key]: h }), {} as Record<AiProviderKey, HealthStatus>),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders(false);
  }, [fetchProviders]);

  const openConfig = (key: AiProviderKey) => {
    const defaults = PROVIDER_DEFAULTS[key];
    const existing = providers.find((p) => p.key === key);
    setFormConfig({
      ...defaults,
      key,
      enabled: existing?.enabled ?? false,
      model: existing?.model ?? defaults.model ?? "",
    });
    setSelectedProvider(key);
    setActiveTab("configure");
    setShowSecret(false);
    setSaveState({ saving: false });
  };

  const saveConfig = async () => {
    if (!selectedProvider) return;
    setSaveState({ saving: true });

    const validation = validateProviderConfig(formConfig as AiProviderConfig);
    if (validation.length > 0) {
      setSaveState({ saving: false, error: validation.join("; ") });
      return;
    }

    try {
      const response = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedProvider,
          config: formConfig,
          setDefault: formConfig.enabled && !providers.some((p) => p.isDefault && p.key !== selectedProvider),
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      setSaveState({ saving: false, ok: true });
      await fetchProviders();
      setTimeout(() => setActiveTab("list"), 600);
    } catch (e) {
      setSaveState({ saving: false, error: e instanceof Error ? e.message : "Save failed" });
    }
  };

  const deleteConfig = async (key: AiProviderKey) => {
    if (!confirm(`Remove configuration for ${getProviderDisplayName({ key } as AiProviderConfig)}?`)) return;
    try {
      await fetch(`/api/ai-providers?key=${key}`, { method: "DELETE" });
      await fetchProviders();
    } catch {
      // ignore
    }
  };

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(24,39,32,0.05)] transition-colors focus:border-leaf-deep";

  const sortedProviders = useMemo(() => {
    return [...providers].sort(
      (a, b) => PROVIDER_ORDER.indexOf(a.key) - PROVIDER_ORDER.indexOf(b.key),
    );
  }, [providers]);

  const enabledCount = providers.filter((p) => p.enabled).length;

  const renderProviderCard = (provider: ProviderState) => {
    const h = health[provider.key];
    const isHealthy = h?.status === "healthy";
    return (
      <div
        key={provider.key}
        className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
          provider.enabled ? "border-leaf/60" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 items-center justify-center rounded-xl text-sm font-bold ${
                provider.enabled ? "bg-leaf-soft text-leaf-deep" : "bg-mist text-ink/50"
              }`}
            >
              {provider.key.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-display text-sm font-bold text-ink">{provider.name}</p>
              <p className="font-mono text-[10px] text-ink/45">{provider.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {provider.isDefault && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-700">
                Default
              </span>
            )}
            <span
              className={`size-2 rounded-full ${
                provider.enabled ? (isHealthy ? "bg-leaf dot-live" : "bg-ember") : "bg-ink/15"
              }`}
            />
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-ink/60">
          {PROVIDER_DEFAULTS[provider.key].description}
        </p>

        {provider.enabled && h && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                  h.status === "healthy"
                    ? "bg-leaf-soft text-leaf-deep"
                    : h.status === "degraded"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-600"
                }`}
              >
                {h.status}
              </span>
              <span className="font-mono text-[9px] text-ink/35">{h.latencyMs}ms</span>
            </div>
            {h.error && (
              <p className="rounded-lg bg-rose-50 px-2 py-1.5 font-mono text-[10px] leading-4 text-rose-600">
                {h.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => openConfig(provider.key)}
            className="flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono text-[11px] font-bold text-ink transition-colors hover:bg-mist"
          >
            {provider.hasKey ? "Edit" : "Configure"}
          </button>
          {provider.hasKey && (
            <button
              type="button"
              onClick={() => deleteConfig(provider.key)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-100"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink/70">
            Configure multiple AI providers and switch between them per analysis. Mix cloud and local
            options — use Anthropic, Azure OpenAI (Copilot backend), local Ollama, or any
            OpenAI-compatible endpoint.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fetchProviders(true)}
            className="rounded-xl border border-line bg-white px-4 py-3 font-mono text-[11px] font-bold text-ink/70 transition hover:bg-mist"
          >
            Test All Providers
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-sm">
            <div className="text-right">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                Active providers
              </p>
              <p
                className={`mt-1 font-display text-lg font-bold ${
                  enabledCount > 0 ? "text-leaf-deep" : "text-amber-600"
                }`}
              >
                {enabledCount} configured
              </p>
            </div>
            <span
              className={`size-3 rounded-full ${
                enabledCount > 0 ? "bg-leaf dot-live" : "bg-ember"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`rounded-full px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] transition-all ${
            activeTab === "list"
              ? "bg-pine text-paper"
              : "bg-white text-ink/60 hover:bg-mist"
          }`}
        >
          Providers
        </button>
        {activeTab === "configure" && (
          <button
            type="button"
            className="rounded-full bg-leaf-soft px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-leaf-deep"
          >
            Configuring {selectedProvider}
          </button>
        )}
      </div>

      {activeTab === "list" && (
        <div className="space-y-8">
          {loading ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
              <span className="font-mono text-sm text-ink/50">Loading providers…</span>
            </div>
          ) : (
            <>
              {/* Cloud providers section */}
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55">
                    Cloud Providers
                  </h3>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sortedProviders
                    .filter((p) => p.tier === "cloud")
                    .map((provider) => renderProviderCard(provider))}
                </div>
              </div>

              {/* Local providers section */}
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55">
                    Local Providers
                  </h3>
                  <span className="h-px flex-1 bg-line" />
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    Runs on your machine
                  </span>
                </div>
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] leading-5 text-amber-800">
                  {LOCAL_PROVIDER_NOTE}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sortedProviders
                    .filter((p) => p.tier === "local")
                    .map((provider) => renderProviderCard(provider))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "configure" && selectedProvider && (
        <div className="rounded-3xl border border-line bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="rounded-lg border border-line bg-mist/60 px-3 py-1.5 font-mono text-[11px] font-bold text-ink/60 hover:bg-mist"
            >
              ← Back
            </button>
            <h3 className="font-display text-xl font-bold text-ink">
              Configure {PROVIDER_DEFAULTS[selectedProvider].name}
            </h3>
            {PROVIDER_DEFAULTS[selectedProvider].tier === "local" && (
              <span className="rounded-full bg-amber-50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Local Only
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Enable this provider
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormConfig((c) => ({ ...c, enabled: !c.enabled }))
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    formConfig.enabled ? "bg-leaf" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                      formConfig.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="font-mono text-xs text-ink/60">
                  {formConfig.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Model
              </label>
              <input
                value={formConfig.model || ""}
                onChange={(e) => setFormConfig((c) => ({ ...c, model: e.target.value }))}
                placeholder={PROVIDER_DEFAULTS[selectedProvider].model}
                className={`${inputCls} mt-2 font-mono text-[13px]`}
              />
              <p className="mt-1 font-mono text-[10px] text-ink/40">
                Default: {PROVIDER_DEFAULTS[selectedProvider].model}
              </p>
            </div>

            {(selectedProvider === "openai" ||
              selectedProvider === "anthropic" ||
              selectedProvider === "azure-openai") && (
              <div className="md:col-span-2">
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  API Key
                </label>
                <div className="relative mt-2">
                  <input
                    value={formConfig.apiKey || ""}
                    onChange={(e) => setFormConfig((c) => ({ ...c, apiKey: e.target.value }))}
                    type={showSecret ? "text" : "password"}
                    placeholder="sk-... or ant-..."
                    className={`${inputCls} pr-20 font-mono text-[13px]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-[10px] font-semibold text-ink/50 hover:bg-mist"
                  >
                    {showSecret ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p className="mt-1 font-mono text-[10px] text-ink/40">
                  Stored server-side only. Re-enter the key if you need to update it — the saved value is never returned to the browser for security.
                </p>
              </div>
            )}

            {selectedProvider === "azure-openai" && (
              <>
                <div className="md:col-span-2">
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                    Endpoint URL
                  </label>
                  <input
                    value={formConfig.endpoint || ""}
                    onChange={(e) => setFormConfig((c) => ({ ...c, endpoint: e.target.value }))}
                    placeholder={PROVIDER_DEFAULTS[selectedProvider].endpoint}
                    className={`${inputCls} mt-2 font-mono text-[13px]`}
                  />
                  <p className="mt-1 font-mono text-[10px] text-ink/40">
                    Format: https://resource.openai.azure.com/openai/deployments/DEPLOYMENT/chat/completions
                  </p>
                </div>
                <div>
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                    API Version
                  </label>
                  <input
                    value={formConfig.apiVersion || ""}
                    onChange={(e) => setFormConfig((c) => ({ ...c, apiVersion: e.target.value }))}
                    placeholder="2024-08-01-preview"
                    className={`${inputCls} mt-2 font-mono text-[13px]`}
                  />
                </div>
              </>
            )}

            {(selectedProvider === "ollama" || selectedProvider === "generic") && (
              <div className="md:col-span-2">
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  Endpoint URL
                </label>
                <input
                  value={formConfig.endpoint || ""}
                  onChange={(e) => setFormConfig((c) => ({ ...c, endpoint: e.target.value }))}
                  placeholder={PROVIDER_DEFAULTS[selectedProvider].endpoint}
                  className={`${inputCls} mt-2 font-mono text-[13px]`}
                />
                {selectedProvider === "ollama" && (
                  <p className="mt-1 font-mono text-[10px] text-ink/40">
                    Install Ollama from ollama.com, run `ollama pull llama3.2`, and leave the default endpoint.
                  </p>
                )}
                {selectedProvider === "generic" && (
                  <p className="mt-1 font-mono text-[10px] text-ink/40">
                    Works with Groq, Together, LM Studio, vLLM, or any OpenAI-compatible endpoint.
                  </p>
                )}
              </div>
            )}

            {selectedProvider === "generic" && (
              <div className="md:col-span-2">
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  API Key (optional)
                </label>
                <input
                  value={formConfig.apiKey || ""}
                  onChange={(e) => setFormConfig((c) => ({ ...c, apiKey: e.target.value }))}
                  type={showSecret ? "text" : "password"}
                  placeholder="Bearer token if required"
                  className={`${inputCls} mt-2 font-mono text-[13px]`}
                />
              </div>
            )}

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Temperature
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formConfig.temperature ?? 0.2}
                onChange={(e) =>
                  setFormConfig((c) => ({
                    ...c,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="mt-3 w-full"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-ink/40">
                <span>Precise (0)</span>
                <span>{formConfig.temperature ?? 0.2}</span>
                <span>Creative (1)</span>
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Max Tokens
              </label>
              <input
                type="number"
                min="500"
                max="16000"
                step="500"
                value={formConfig.maxTokens ?? 4000}
                onChange={(e) =>
                  setFormConfig((c) => ({
                    ...c,
                    maxTokens: parseInt(e.target.value, 10),
                  }))
                }
                className={`${inputCls} mt-2 font-mono text-[13px]`}
              />
            </div>
          </div>

          {saveState.error && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveState.error}
            </div>
          )}

          {saveState.ok && (
            <div className="mt-5 rounded-xl border border-leaf/40 bg-leaf-soft px-4 py-3 text-sm text-leaf-deep">
              Configuration saved successfully.
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={saveConfig}
              disabled={saveState.saving}
              className="rounded-xl bg-pine px-6 py-3 font-display text-sm font-bold text-paper shadow-lg shadow-pine/25 transition-all hover:-translate-y-0.5 hover:bg-pine-soft disabled:opacity-60"
            >
              {saveState.saving ? "Saving…" : "Save Provider"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="rounded-xl border border-line bg-white px-6 py-3 font-display text-sm font-bold text-ink transition-colors hover:bg-mist"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
