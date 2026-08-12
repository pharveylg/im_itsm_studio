import { db } from "@/db";
import { connectionConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeInstanceUrl, type ConnectionSettings } from "./connection-shared";

export type ServiceNowTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

/**
 * Execute the password grant token request to ServiceNow.
 */
async function requestPasswordToken(config: typeof connectionConfig.$inferSelect): Promise<ServiceNowTokenResponse> {
  const url = `${config.instanceUrl}/oauth_token.do`;
  const body = new URLSearchParams();
  body.append("grant_type", "password");
  body.append("client_id", config.clientId);
  if (config.clientSecret) {
    body.append("client_secret", config.clientSecret);
  }
  body.append("username", config.serviceUsername || "");
  body.append("password", config.servicePassword || "");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ServiceNow OAuth token request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  return (await response.json()) as ServiceNowTokenResponse;
}

/**
 * Execute the refresh token grant request to ServiceNow.
 */
async function requestRefreshToken(config: typeof connectionConfig.$inferSelect): Promise<ServiceNowTokenResponse> {
  const url = `${config.instanceUrl}/oauth_token.do`;
  const body = new URLSearchParams();
  body.append("grant_type", "refresh_token");
  body.append("client_id", config.clientId);
  if (config.clientSecret) {
    body.append("client_secret", config.clientSecret);
  }
  body.append("refresh_token", config.refreshToken || "");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ServiceNow OAuth refresh request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  return (await response.json()) as ServiceNowTokenResponse;
}

/**
 * Get a valid access token for the connection. Automatically refreshes
 * using the refresh_token flow when near expiration, or falls back to
 * password grant to establish a fresh session if needed.
 */
export async function getValidAccessToken(): Promise<string> {
  const [config] = await db
    .select()
    .from(connectionConfig)
    .where(eq(connectionConfig.id, 1))
    .limit(1);

  if (!config || !config.instanceUrl) {
    throw new Error("ServiceNow connection settings are not configured. Go to Settings.");
  }

  if (config.authMethod !== "ropc") {
    throw new Error(`Active connection auth method is configured as ${config.authMethod}. To fetch live records, please select Resource Owner Password Credentials (ROPC) in Settings.`);
  }

  // Check if we have a valid cached token (with a 2-minute buffer)
  if (
    config.accessToken &&
    config.tokenExpiresAt &&
    new Date(config.tokenExpiresAt).getTime() > Date.now() + 120_000
  ) {
    return config.accessToken;
  }

  let tokenResponse: ServiceNowTokenResponse;

  if (config.refreshToken) {
    try {
      console.log("[ServiceNow Client] Refreshing expired token...");
      tokenResponse = await requestRefreshToken(config);
    } catch (e) {
      console.warn("[ServiceNow Client] Refresh failed, falling back to password grant:", e);
      tokenResponse = await requestPasswordToken(config);
    }
  } else {
    console.log("[ServiceNow Client] Acquiring initial token...");
    tokenResponse = await requestPasswordToken(config);
  }

  // Calculate new expiration time
  const expiresIn = tokenResponse.expires_in || 1800; // default 30 mins
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  // Update connection settings record securely with new tokens
  await db
    .update(connectionConfig)
    .set({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? config.refreshToken, // keep old if not returned
      tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(connectionConfig.id, 1));

  return tokenResponse.access_token;
}

/**
 * Perform a live GET query against the ServiceNow Table API.
 */
export async function queryServiceNowTable(
  tableName: string,
  sysparmQuery: string,
  sysparmFields?: string[],
  sysparmLimit = 10
): Promise<any[]> {
  const [config] = await db
    .select()
    .from(connectionConfig)
    .where(eq(connectionConfig.id, 1))
    .limit(1);

  if (!config || !config.instanceUrl) {
    throw new Error("ServiceNow connection settings are not configured. Go to Settings.");
  }

  const token = await getValidAccessToken();
  const url = new URL(`${config.instanceUrl}/api/now/table/${tableName}`);
  url.searchParams.set("sysparm_query", sysparmQuery);
  url.searchParams.set("sysparm_limit", sysparmLimit.toString());
  url.searchParams.set("sysparm_display_value", "all");
  url.searchParams.set("sysparm_exclude_reference_link", "true");
  if (sysparmFields && sysparmFields.length > 0) {
    url.searchParams.set("sysparm_fields", sysparmFields.join(","));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ServiceNow Table API failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { result: any[] | any };
  return Array.isArray(payload.result) ? payload.result : [payload.result];
}

/**
 * Fetch a single incident, problem, change, or requested item by number
 * and deterministically build a ServiceNow-style XML document to match
 * the input structure expected by the workbench.
 */
export async function fetchLiveRecordAsXml(
  module: "incident" | "problem" | "change" | "knowledge" | "service_catalog",
  recordNumber: string
): Promise<{ filename: string; xml: string }> {
  let tableName = "incident";
  let queryField = "number";
  let fields: string[] = ["sys_id", "number", "short_description", "description", "state", "priority", "sys_created_on", "sys_updated_on"];

  if (module === "incident") {
    tableName = "incident";
    fields.push("location", "caller_id", "assignment_group", "assigned_to", "business_impact");
  } else if (module === "problem") {
    tableName = "problem";
    fields.push("workaround", "root_cause", "fix_notes");
  } else if (module === "change") {
    tableName = "change_request";
    fields.push("type", "risk", "implementation_plan", "backout_plan", "test_plan", "justification");
  } else if (module === "knowledge") {
    tableName = "kb_knowledge";
    fields.push("kb_knowledge_base", "kb_category", "workflow_state");
  } else if (module === "service_catalog") {
    tableName = "sc_req_item";
    fields.push("request", "quantity", "stage", "requested_for");
  }

  console.log(`[ServiceNow Client] Fetching ${tableName} matching ${recordNumber}...`);
  const records = await queryServiceNowTable(tableName, `${queryField}=${recordNumber}`, fields, 1);

  if (!records || records.length === 0) {
    throw new Error(`No ${tableName} record found matching number "${recordNumber}"`);
  }

  const record = records[0];
  const sysId = typeof record.sys_id === "object" ? record.sys_id.value : record.sys_id;

  // Let's also fetch incident_tasks or related items to include as related lists if this is an incident
  let relatedXml = "";
  if (module === "incident") {
    try {
      console.log(`[ServiceNow Client] Fetching related incident tasks for incident ${sysId}...`);
      const tasks = await queryServiceNowTable("incident_task", `incident=${sysId}`, ["number", "short_description", "state", "assigned_to"]);
      if (tasks && tasks.length > 0) {
        relatedXml += "\n  <incident_tasks>\n";
        for (const task of tasks) {
          relatedXml += `    <incident_task>\n`;
          for (const [k, v] of Object.entries(task)) {
            const val = v && typeof v === "object" ? (v as any).display_value || (v as any).value : v;
            if (val) relatedXml += `      <${k}>${escapeXml(String(val))}</${k}>\n`;
          }
          relatedXml += `    </incident_task>\n`;
        }
        relatedXml += "  </incident_tasks>\n";
      }
    } catch (e) {
      console.warn("Could not fetch related incident tasks:", e);
    }
  }

  // Construct XML compatible with our XMLParser
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<unload unload_date="2026-07-23 00:00:00">\n`;
  xml += `  <${tableName}>\n`;
  for (const [k, v] of Object.entries(record)) {
    // ServiceNow returning objects with value/display_value
    const val = v && typeof v === "object" ? (v as any).display_value || (v as any).value : v;
    if (val) {
      xml += `    <${k}>${escapeXml(String(val))}</${k}>\n`;
    }
  }
  xml += relatedXml;
  xml += `  </${tableName}>\n</unload>\n`;

  return {
    filename: `${recordNumber}.xml`,
    xml,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
