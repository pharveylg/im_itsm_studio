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
      service_username text,
      service_password text,
      access_token text,
      refresh_token text,
      token_expires_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // CREATE TABLE IF NOT EXISTS is a no-op on an already-existing table, so
  // columns added here after the table's first deploy must be backfilled
  // explicitly or they silently never reach the live database.
  await db.execute(sql`
    ALTER TABLE connection_config
      ADD COLUMN IF NOT EXISTS service_username text,
      ADD COLUMN IF NOT EXISTS service_password text,
      ADD COLUMN IF NOT EXISTS access_token text,
      ADD COLUMN IF NOT EXISTS refresh_token text,
      ADD COLUMN IF NOT EXISTS token_expires_at timestamptz
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

    const hasActiveToken = Boolean(
      row.accessToken &&
      row.tokenExpiresAt &&
      new Date(row.tokenExpiresAt).getTime() > Date.now()
    );

    return {
      configured: Boolean(row.instanceUrl && row.clientId),
      instanceUrl: row.instanceUrl,
      clientIdSet: Boolean(row.clientId),
      hasSecret: Boolean(row.clientSecret),
      authMethod: row.authMethod as AuthMethod,
      scope: row.scope,
      redirectUri: row.redirectUri,
      serviceUsername: row.serviceUsername,
      hasPassword: Boolean(row.servicePassword),
      hasActiveToken,
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

  // Retrieve current database record to facilitate preserving secrets/passwords
  const [existing] = await db
    .select()
    .from(connectionConfig)
    .where(eq(connectionConfig.id, 1))
    .limit(1);

  let clientSecret: string | null = null;
  if (input.authMethod === "client_secret" || input.authMethod === "ropc") {
    clientSecret = input.clientSecret?.trim() ?? null;
    if (!clientSecret && input.keepSecret && existing) {
      clientSecret = existing.clientSecret;
    }
  }

  let serviceUsername: string | null = null;
  let servicePassword: string | null = null;
  if (input.authMethod === "ropc") {
    serviceUsername = input.serviceUsername?.trim() ?? null;
    servicePassword = input.servicePassword?.trim() ?? null;
    if (!servicePassword && input.keepPassword && existing) {
      servicePassword = existing.servicePassword;
    }
  }

  // If the auth credentials or method changed, invalidate current access tokens
  const credentialsChanged = existing && (
    existing.authMethod !== input.authMethod ||
    existing.clientId !== input.clientId.trim() ||
    existing.clientSecret !== clientSecret ||
    existing.serviceUsername !== serviceUsername ||
    existing.servicePassword !== servicePassword
  );

  const values = {
    instanceUrl: normalizeInstanceUrl(input.instanceUrl),
    clientId: input.clientId.trim(),
    clientSecret,
    redirectUri: input.redirectUri.trim(),
    authMethod: input.authMethod,
    scope: input.scope.trim() || "useraccount",
    serviceUsername,
    servicePassword,
    // Clear tokens if config parameters changed
    accessToken: credentialsChanged ? null : (existing?.accessToken ?? null),
    refreshToken: credentialsChanged ? null : (existing?.refreshToken ?? null),
    tokenExpiresAt: credentialsChanged ? null : (existing?.tokenExpiresAt ?? null),
    updatedAt: new Date(),
  };

  await db
    .insert(connectionConfig)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: connectionConfig.id, set: values });
}
