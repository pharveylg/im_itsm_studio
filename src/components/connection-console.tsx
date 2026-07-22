"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deriveEndpoints,
  isValidInstanceUrl,
  normalizeInstanceUrl,
  type AuthMethod,
  type PublicConnectionState,
} from "@/lib/connection-shared";

type PreflightStepStatus = "pending" | "active" | "done" | "failed";

type PreflightStep = {
  id: string;
  label: string;
  detail: string;
  status: PreflightStepStatus;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; errors: string[] };

const SCOPE_OPTIONS = ["useraccount", "openid", "email", "profile"] as const;

const AUTH_METHODS: {
  key: AuthMethod;
  title: string;
  note: string;
  recommended?: boolean;
}[] = [
  {
    key: "pkce",
    title: "Authorization Code + PKCE",
    note: "Public client. ServiceNow brokers the sign-in through your Microsoft SSO. No secret to manage.",
    recommended: true,
  },
  {
    key: "client_secret",
    title: "Confidential client",
    note: "ServiceNow issues a client secret alongside the Client ID. Store it server-side only.",
  },
  {
    key: "basic",
    title: "Basic / session auth",
    note: "Legacy fallback. Most SSO-only instances block password auth — use only if your admins allow it.",
  },
];

const PREREQUISITES = [
  {
    title: "OAuth 2.0 active on the instance",
    detail: "sys_properties → com.snc.platform.security.oauth.is.active = true",
  },
  {
    title: "Application Registry entry created",
    detail: "System OAuth → Application Registry → “Create an OAuth API endpoint for external clients” (tick “PKCE required”)",
  },
  {
    title: "Redirect URL registered",
    detail: "Paste the exact callback URL shown on this page into the registry record.",
  },
  {
    title: "SSO broker in place",
    detail: "Instance login already routes to Microsoft Entra (the same SSO behind MyApps).",
  },
  {
    title: "Read access for your user",
    detail: "itil / fulfiller-level ACLs across incident, problem, change_request, kb_knowledge, sc_request and sc_req_item.",
  },
];

const PHASE2_ENDPOINTS = [
  { method: "GET", path: "/api/now/table/incident", note: "incidents + major incidents (major_incident_state)" },
  { method: "GET", path: "/api/now/table/problem", note: "problems, root cause, known errors" },
  { method: "GET", path: "/api/now/table/change_request", note: "changes, risk, approvals" },
  { method: "GET", path: "/api/now/table/kb_knowledge", note: "knowledge articles" },
  { method: "GET", path: "/api/now/table/sc_request", note: "catalog requests" },
  { method: "GET", path: "/api/now/table/sc_req_item", note: "requested items (RITM) + sc_task fulfillment" },
];

const PHASE2_FEATURES = [
  "OAuth token lifecycle — authorize, exchange, silent refresh, encrypted server-side storage.",
  "Related-list fan-out via sysparm_query, mirroring the XML workbench context model.",
  "SSO-first login through Microsoft Entra — no passwords handled by this app.",
  "ACL-aware error surfacing per module instead of hard failures.",
];

const preflightSteps = (base: string): PreflightStep[] => [
  { id: "url", label: "Normalize instance URL", detail: "https scheme, trailing slash stripped", status: "pending" },
  { id: "endpoints", label: "Derive OAuth endpoints", detail: `${base}/oauth_auth.do · /oauth_token.do`, status: "pending" },
  { id: "client", label: "Check client registration", detail: "Client ID exists in Application Registry", status: "pending" },
  { id: "sso", label: "Broker SSO handshake", detail: "Microsoft Entra delegation on authorize", status: "pending" },
  { id: "scope", label: "Probe Table API scope", detail: "read on the six ITSM module tables", status: "pending" },
];

export function ConnectionConsole({
  connection,
  defaultRedirectUri,
}: {
  connection: PublicConnectionState;
  defaultRedirectUri: string;
}) {
  const [instanceUrl, setInstanceUrl] = useState(connection.instanceUrl ?? "");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(connection.authMethod ?? "pkce");
  const [scopes, setScopes] = useState<string[]>(
    connection.scope ? connection.scope.split(/\s+/).filter(Boolean) : ["useraccount"],
  );
  const [redirectUri, setRedirectUri] = useState(connection.redirectUri ?? defaultRedirectUri);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [steps, setSteps] = useState<PreflightStep[]>(() => preflightSteps("https://yourinstance.service-now.com"));
  const [preflightPhase, setPreflightPhase] = useState<"idle" | "running" | "done" | "failed">("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const normalized = normalizeInstanceUrl(instanceUrl);
  const urlValid = isValidInstanceUrl(instanceUrl);
  const endpoints = useMemo(
    () => deriveEndpoints(instanceUrl, clientId, redirectUri, authMethod),
    [instanceUrl, clientId, redirectUri, authMethod],
  );

  const scopeString = useMemo(
    () => (scopes.includes("useraccount") ? scopes : ["useraccount", ...scopes]).join(" "),
    [scopes],
  );

  function toggleScope(scope: string) {
    if (scope === "useraccount") return; // always required
    setScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope],
    );
  }

  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(redirectUri);
    } catch {
      const area = document.createElement("textarea");
      area.value = redirectUri;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function save() {
    setSaveState({ kind: "saving" });
    try {
      const response = await fetch("/api/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceUrl,
          clientId,
          clientSecret: authMethod === "client_secret" ? clientSecret : null,
          keepSecret: authMethod === "client_secret" && !clientSecret && connection.hasSecret,
          redirectUri,
          authMethod,
          scope: scopeString,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; errors?: string[] };
      if (!response.ok || !payload.ok) {
        setSaveState({ kind: "error", errors: payload.errors ?? ["Unable to save the connection draft."] });
        return;
      }
      setSaveState({ kind: "saved", at: new Date().toLocaleTimeString() });
    } catch {
      setSaveState({ kind: "error", errors: ["Unable to reach the server."] });
    }
  }

  function runPreflight() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPreflightPhase("running");
    setSteps(preflightSteps(endpoints.base).map((step) => ({ ...step, status: "pending" })));

    const failAtUrl = !urlValid;
    const durations = failAtUrl ? [500] : [550, 750, 900, 1100, 900];
    let elapsed = 0;

    durations.forEach((duration, index) => {
      elapsed += 150;
      const startAt = elapsed;
      elapsed += duration;

      timersRef.current.push(
        setTimeout(() => {
          setSteps((current) =>
            current.map((step, i) => (i === index ? { ...step, status: "active" } : step)),
          );
        }, startAt),
      );

      timersRef.current.push(
        setTimeout(() => {
          if (failAtUrl && index === 0) {
            setSteps((current) =>
              current.map((step, i) => (i === 0 ? { ...step, status: "failed" } : step)),
            );
            setPreflightPhase("failed");
            return;
          }
          setSteps((current) =>
            current.map((step, i) => (i === index ? { ...step, status: "done" } : step)),
          );
          if (index === durations.length - 1) setPreflightPhase("done");
        }, elapsed),
      );
    });
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 shadow-[0_1px_2px_rgba(24,39,32,0.05)] transition-colors focus:border-leaf-deep";

  return (
    <div className="space-y-10">
      {/* Status row */}
      <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" style={{ "--d": "0s" } as React.CSSProperties}>
        <div>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink/70">
            Capture everything the live REST integration will need — instance, OAuth client,
            redirect URI, scopes. Settings persist on this server; the live handshake itself
            ships in a future release.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-sm">
          <div className="text-right">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Connection status
            </p>
            <p className={`mt-1 font-display text-lg font-bold ${connection.configured ? "text-leaf-deep" : "text-amber-600"}`}>
              {connection.configured ? "Draft prepared" : "Not prepared yet"}
            </p>
            {connection.updatedAt && (
              <p className="font-mono text-[10px] text-ink/40">
                last saved {new Date(connection.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <span className={`size-3 rounded-full ${connection.configured ? "bg-leaf dot-live" : "bg-ember"}`} />
        </div>
      </div>

      {/* Prerequisites */}
      <section className="reveal" style={{ "--d": "0.08s" } as React.CSSProperties}>
        <div className="mb-4 flex items-baseline gap-3">
          <span className="font-display text-2xl font-extrabold text-ink/15">01</span>
          <h2 className="font-display text-xl font-bold text-ink">Prerequisites on the ServiceNow side</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {PREREQUISITES.map((item, index) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-line bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-leaf/60 hover:shadow-md"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-leaf-soft font-mono text-xs font-semibold text-leaf-deep transition-colors group-hover:bg-leaf group-hover:text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 text-[13px] font-semibold leading-5 text-ink">{item.title}</h3>
              <p className="mt-2 font-mono text-[11px] leading-4.5 text-ink/55">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + live endpoint preview */}
      <section className="reveal grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]" style={{ "--d": "0.16s" } as React.CSSProperties}>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(17,52,44,0.35)] sm:p-8">
          <div className="mb-6 flex items-baseline gap-3">
            <span className="font-display text-2xl font-extrabold text-ink/15">02</span>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Connection inputs</h2>
              <p className="mt-1 text-[13px] text-ink/55">Exactly what the live integration will consume.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Instance URL
              </label>
              <div className="relative mt-2">
                <input
                  value={instanceUrl}
                  onChange={(event) => setInstanceUrl(event.target.value)}
                  placeholder="https://yourinstance.service-now.com"
                  className={`${inputCls} pr-24 font-mono text-[13px]`}
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    !instanceUrl.trim()
                      ? "bg-mist text-ink/45"
                      : urlValid
                        ? "bg-leaf-soft text-leaf-deep"
                        : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {!instanceUrl.trim() ? "REQUIRED" : urlValid ? "VALID ✓" : "CHECK URL"}
                </span>
              </div>
              {instanceUrl.trim() && !urlValid && (
                <p className="mt-1.5 text-xs text-rose-600">
                  Expected shape: https://&lt;instance&gt;.service-now.com
                </p>
              )}
            </div>

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Auth method
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {AUTH_METHODS.map((method) => {
                  const active = authMethod === method.key;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => setAuthMethod(method.key)}
                      className={`relative rounded-xl border p-3.5 text-left transition-all duration-200 ${
                        active
                          ? "border-pine bg-pine text-paper shadow-md"
                          : "border-line bg-paper/60 text-ink hover:border-ink/30 hover:bg-mist/60"
                      }`}
                    >
                      {method.recommended && (
                        <span className={`absolute -top-2 right-3 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${active ? "bg-leaf text-pine-deep" : "bg-leaf-soft text-leaf-deep"}`}>
                          SSO-ready
                        </span>
                      )}
                      <span className="block text-[13px] font-semibold leading-5">{method.title}</span>
                      <span className={`mt-1.5 block text-[11px] leading-4 ${active ? "text-paper/70" : "text-ink/55"}`}>
                        {method.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {authMethod !== "basic" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                    OAuth Client ID
                  </label>
                  <input
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder="Auto-generated in Application Registry"
                    className={`${inputCls} mt-2 font-mono text-[13px]`}
                  />
                </div>
                {authMethod === "client_secret" && (
                  <div>
                    <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                      Client secret
                    </label>
                    <div className="relative mt-2">
                      <input
                        value={clientSecret}
                        onChange={(event) => setClientSecret(event.target.value)}
                        type={showSecret ? "text" : "password"}
                        placeholder={connection.hasSecret ? "Saved — leave blank to keep" : "Paste once, stored encrypted"}
                        className={`${inputCls} pr-16 font-mono text-[13px]`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-[10px] font-semibold text-ink/50 hover:bg-mist"
                      >
                        {showSecret ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {authMethod === "basic" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Credentials are entered at connect time in Phase 2 and never persisted here. If your
                instance is SSO-only (MyApps / Entra), basic auth will most likely be rejected.
              </p>
            )}

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                OAuth scopes
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map((scope) => {
                  const active = scope === "useraccount" || scopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      disabled={scope === "useraccount"}
                      className={`rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-200 ${
                        active
                          ? "border-leaf-deep/40 bg-leaf-soft text-leaf-deep"
                          : "border-line bg-white text-ink/50 hover:border-ink/30 hover:text-ink"
                      } ${scope === "useraccount" ? "cursor-default" : ""}`}
                    >
                      {scope}
                      {scope === "useraccount" && <span className="ml-1.5 text-[9px] uppercase tracking-wider opacity-60">locked</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                Redirect URI — register this exact value in ServiceNow
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={redirectUri}
                  onChange={(event) => setRedirectUri(event.target.value)}
                  className={`${inputCls} font-mono text-[12px]`}
                />
                <button
                  type="button"
                  onClick={copyRedirect}
                  className="shrink-0 rounded-xl border border-pine/30 bg-pine px-4 font-mono text-[11px] font-semibold text-paper transition-all hover:bg-pine-soft active:scale-95"
                >
                  {copied ? "COPIED ✓" : "COPY"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <button
                type="button"
                onClick={save}
                disabled={saveState.kind === "saving"}
                className="rounded-xl bg-pine px-6 py-3 font-display text-sm font-bold text-paper shadow-lg shadow-pine/25 transition-all hover:-translate-y-0.5 hover:bg-pine-soft active:translate-y-0 disabled:opacity-60"
              >
                {saveState.kind === "saving" ? "Saving draft…" : "Save connection draft"}
              </button>
              {saveState.kind === "saved" && (
                <span className="font-mono text-xs font-medium text-leaf-deep">
                  ✓ saved at {saveState.at}
                </span>
              )}
              {saveState.kind === "error" && (
                <span className="text-xs font-medium text-rose-600">
                  {saveState.errors.join(" ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live endpoint readout */}
        <div className="flex flex-col gap-4">
          <div className="terminal rounded-3xl p-5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="size-2.5 rounded-full bg-rose-400/80" />
              <span className="size-2.5 rounded-full bg-ember/80" />
              <span className="size-2.5 rounded-full bg-leaf/90" />
              <span className="ml-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper/50">
                Endpoint preview — live
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {[
                { label: "authorize", value: endpoints.authorize },
                { label: "token", value: endpoints.token },
                { label: "revoke", value: endpoints.revoke },
                { label: "table api", value: endpoints.tableSample },
              ].map((row) => (
                <div key={row.label}>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-leaf/60">
                    {row.label}
                  </p>
                  <p className="mt-1 break-all font-mono text-[11.5px] leading-5 text-leaf">
                    {row.value}
                  </p>
                </div>
              ))}
              <p className="caret font-mono text-[11.5px] text-paper/40">
                updates as you type
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 text-xs leading-5 text-ink/60 shadow-sm">
            <span className="font-semibold text-ink">Scope string that will be requested:</span>{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink/80">{scopeString}</code>
          </div>
        </div>
      </section>

      {/* Preflight */}
      <section className="reveal" style={{ "--d": "0.24s" } as React.CSSProperties}>
        <div className="mb-4 flex items-baseline gap-3">
          <span className="font-display text-2xl font-extrabold text-ink/15">03</span>
          <h2 className="font-display text-xl font-bold text-ink">Pre-flight check</h2>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-ink/70">
              Walks the steps the live integration will perform. This is a{" "}
              <span className="font-semibold text-ink">simulated dry run</span> — no network calls
              are made until Phase 2.
            </p>
            <button
              type="button"
              onClick={runPreflight}
              disabled={preflightPhase === "running"}
              className="shrink-0 rounded-xl border-2 border-pine px-5 py-2.5 font-display text-sm font-bold text-pine transition-all hover:bg-pine hover:text-paper disabled:cursor-wait disabled:opacity-60"
            >
              {preflightPhase === "running" ? "Running…" : preflightPhase === "idle" ? "Run simulated pre-flight" : "Re-run"}
            </button>
          </div>

          <ol className="mt-6 space-y-2.5">
            {steps.map((step) => (
              <li
                key={step.id}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-300 ${
                  step.status === "active"
                    ? "border-leaf/60 bg-leaf-soft/60"
                    : step.status === "done"
                      ? "border-line bg-paper/70"
                      : step.status === "failed"
                        ? "border-rose-200 bg-rose-50"
                        : "border-line/70 bg-white"
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center">
                  {step.status === "done" && <span className="font-bold text-leaf-deep">✓</span>}
                  {step.status === "failed" && <span className="font-bold text-rose-600">✕</span>}
                  {step.status === "active" && <span className="size-2.5 rounded-full bg-leaf dot-live" />}
                  {step.status === "pending" && <span className="size-2 rounded-full bg-ink/15" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${step.status === "pending" ? "text-ink/45" : "text-ink"}`}>
                    {step.label}
                  </p>
                  <p className="truncate font-mono text-[11px] text-ink/45">{step.detail}</p>
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                  {step.status}
                </span>
              </li>
            ))}
          </ol>

          {preflightPhase === "done" && (
            <div className="mt-5 rounded-2xl border border-ember/50 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
              <span className="font-bold">Dry run complete.</span> The real authorize → token →
              Table API handshake is wired for Phase 2 — your inputs above are exactly what it will use.
            </div>
          )}
          {preflightPhase === "failed" && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              Fix the instance URL above, then re-run the pre-flight.
            </div>
          )}
        </div>
      </section>

      {/* Phase 2 — coming soon */}
      <section className="reveal" style={{ "--d": "0.32s" } as React.CSSProperties}>
        <div className="mb-4 flex items-baseline gap-3">
          <span className="font-display text-2xl font-extrabold text-ink/15">04</span>
          <h2 className="font-display text-xl font-bold text-ink">Live REST API integration</h2>
        </div>

        <div className="stripes rounded-3xl border border-line bg-mist/50 p-6 sm:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-ember/60 bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                <span className="size-1.5 rounded-full bg-ember" />
                Coming soon — Phase 2
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink">
                Pull records and related lists straight from ServiceNow
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                Once your connection draft is approved by your ServiceNow admins, this lane goes
                live: SSO sign-in, OAuth tokens, and Table API reads across the six major ITSM
                modules — no more manual XML exports unless you prefer them.
              </p>
              <ul className="mt-5 space-y-2.5">
                {PHASE2_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-3 text-[13px] leading-5 text-ink/75">
                    <span className="mt-0.5 font-bold text-leaf-deep">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <button
                  type="button"
                  disabled
                  title="Ships in Phase 2"
                  className="cursor-not-allowed rounded-xl border border-ink/15 bg-white/70 px-6 py-3 font-display text-sm font-bold text-ink/35"
                >
                  Enable live connection
                </button>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/35">
                  Unlocks when Phase 2 ships
                </p>
              </div>
            </div>

            <div className="w-full max-w-lg shrink-0 rounded-2xl border border-line bg-white p-4 shadow-sm">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/45">
                Table API surface planned
              </p>
              <div className="mt-3 divide-y divide-line/70">
                {PHASE2_ENDPOINTS.map((endpoint) => (
                  <div key={endpoint.path} className="flex items-center gap-3 py-2.5">
                    <span className="rounded-md bg-pine px-2 py-0.5 font-mono text-[10px] font-bold text-leaf">
                      {endpoint.method}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink/80">
                      {endpoint.path}
                    </span>
                    <span className="hidden max-w-[190px] truncate text-[10.5px] text-ink/45 md:block">
                      {endpoint.note}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-mist/80 px-3 py-2 font-mono text-[10.5px] leading-4 text-ink/55">
                + related-list fan-out per record via sysparm_query, same coverage model as the
                XML workbench.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
