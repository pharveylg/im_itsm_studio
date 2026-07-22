import { db } from "@/db";
import { connectionConfig } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  normalizeInstanceUrl,
  type AuthMethod,
  type ConnectionSettings,
  type PublicConnectionState,
} from "./connection-shared";

export * from "./connection-shared";

/** Idempotently create the connection_config table on first use. */
export async function ensureConnectionTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS connection_config (
      id integer PRIMARY KEY DEFAULT 1,
      instance_url text NOT NULL,
      client_id text NOT NULL DEFAULT '',
      client_secret text,
      redirect_uri text NOT NULL,
      auth_method text NOT NULL DEFAULT 'pkce',
      scope text NOT NULL DEFAULT 'useraccount',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function getConnectionState(): Promise<PublicConnectionState> {
  try {
    await ensureConnectionTable();
    const [row] = await db
      .select()
      .from(connectionConfig)
      .where(eq(connectionConfig.id, 1))
      .limit(1);

    if (!row) {
      return {
        configured: false,
        instanceUrl: null,
        clientIdSet: false,
        hasSecret: false,
        authMethod: null,
        scope: null,
        redirectUri: null,
        updatedAt: null,
      };
    }

    return {
      configured: Boolean(row.instanceUrl && row.clientId),
      instanceUrl: row.instanceUrl,
      clientIdSet: Boolean(row.clientId),
      hasSecret: Boolean(row.clientSecret),
      authMethod: row.authMethod as AuthMethod,
      scope: row.scope,
      redirectUri: row.redirectUri,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return {
      configured: false,
      instanceUrl: null,
      clientIdSet: false,
      hasSecret: false,
      authMethod: null,
      scope: null,
      redirectUri: null,
      updatedAt: null,
    };
  }
}

export async function saveConnectionSettings(input: ConnectionSettings): Promise<void> {
  await ensureConnectionTable();

  let clientSecret: string | null =
    input.authMethod === "client_secret" ? input.clientSecret?.trim() ?? null : null;

  // Preserve the stored secret when the form is re-saved with a blank field.
  if (input.authMethod === "client_secret" && !clientSecret && input.keepSecret) {
    const [existing] = await db
      .select({ clientSecret: connectionConfig.clientSecret })
      .from(connectionConfig)
      .where(eq(connectionConfig.id, 1))
      .limit(1);
    clientSecret = existing?.clientSecret ?? null;
  }

  const values = {
    instanceUrl: normalizeInstanceUrl(input.instanceUrl),
    clientId: input.clientId.trim(),
    clientSecret,
    redirectUri: input.redirectUri.trim(),
    authMethod: input.authMethod,
    scope: input.scope.trim() || "useraccount",
    updatedAt: new Date(),
  };

  await db
    .insert(connectionConfig)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: connectionConfig.id, set: values });
}
