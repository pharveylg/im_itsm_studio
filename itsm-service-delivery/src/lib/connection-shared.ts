/**
 * Pure, client-safe helpers for the ServiceNow connection settings.
 * No database or Node-only imports — safe to bundle into the browser.
 */

export type AuthMethod = "pkce" | "client_secret" | "basic";

export type ConnectionSettings = {
  instanceUrl: string;
  clientId: string;
  clientSecret?: string | null;
  /** Keep the previously stored secret instead of overwriting it with blank. */
  keepSecret?: boolean;
  redirectUri: string;
  authMethod: AuthMethod;
  scope: string;
};

export type PublicConnectionState = {
  configured: boolean;
  instanceUrl: string | null;
  clientIdSet: boolean;
  hasSecret: boolean;
  authMethod: AuthMethod | null;
  scope: string | null;
  redirectUri: string | null;
  updatedAt: string | null;
};

const INSTANCE_PATTERN = /^https:\/\/[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+(:\d+)?$/i;

export function normalizeInstanceUrl(value: string): string {
  let url = value.trim().replace(/\s+/g, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, "");
  return url;
}

export function isValidInstanceUrl(value: string): boolean {
  return INSTANCE_PATTERN.test(normalizeInstanceUrl(value));
}

export function validateSettings(input: ConnectionSettings): string[] {
  const errors: string[] = [];
  const instanceUrl = normalizeInstanceUrl(input.instanceUrl);

  if (!instanceUrl) errors.push("Instance URL is required.");
  else if (!isValidInstanceUrl(instanceUrl)) {
    errors.push("Instance URL must look like https://yourinstance.service-now.com");
  }

  if (!/^https?:\/\//i.test(input.redirectUri.trim())) {
    errors.push("Redirect URI must be an absolute http(s) URL.");
  }

  if (!["pkce", "client_secret", "basic"].includes(input.authMethod)) {
    errors.push("Unsupported auth method.");
  }

  if (input.authMethod !== "basic" && !input.clientId.trim()) {
    errors.push("OAuth Client ID is required for this auth method.");
  }

  if (input.authMethod === "client_secret" && !input.clientSecret?.trim() && !input.keepSecret) {
    errors.push("Client secret is required for the confidential-client flow.");
  }

  return errors;
}

/** Derive the ServiceNow OAuth + Table API endpoints from the instance URL. */
export function deriveEndpoints(
  instanceUrl: string,
  clientId: string,
  redirectUri: string,
  authMethod: AuthMethod,
) {
  const base = normalizeInstanceUrl(instanceUrl) || "https://yourinstance.service-now.com";
  const cid = clientId.trim() || "<CLIENT_ID>";
  const authorizeParams = new URLSearchParams({
    response_type: "code",
    client_id: cid,
    redirect_uri: redirectUri || "<REDIRECT_URI>",
    state: "<STATE>",
  });
  if (authMethod === "pkce") {
    authorizeParams.set("code_challenge", "<PKCE_CHALLENGE>");
    authorizeParams.set("code_challenge_method", "S256");
  }

  return {
    base,
    authorize: `${base}/oauth_auth.do?${authorizeParams.toString()}`,
    token: `${base}/oauth_token.do`,
    revoke: `${base}/oauth_revoke.do`,
    tableSample: `${base}/api/now/table/incident?sysparm_limit=1&sysparm_fields=number,state`,
  };
}
