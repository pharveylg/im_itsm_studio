/**
 * Server-side storage for AI provider configurations.
 */

import { db } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  type AiProviderConfig,
  type AiProviderKey,
  PROVIDER_DEFAULTS,
} from "./ai-providers";

/** Ensure the table exists with a basic schema. */
export async function ensureProviderTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      id text PRIMARY KEY,
      config jsonb NOT NULL,
      is_default integer DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/** Get all provider configs. */
export async function getAllProviderConfigs(): Promise<AiProviderConfig[]> {
  await ensureProviderTable();
  const rows = await db.select().from(aiProviderConfigs);
  
  // Merge with defaults to ensure all fields exist
  return rows.map((row) => ({
    ...PROVIDER_DEFAULTS[row.id as AiProviderKey],
    ...row.config,
  }));
}

/** Get a specific provider config. */
export async function getProviderConfig(key: AiProviderKey): Promise<AiProviderConfig | null> {
  await ensureProviderTable();
  const [row] = await db
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.id, key))
    .limit(1);
  
  if (!row) return null;
  
  return {
    ...PROVIDER_DEFAULTS[key],
    ...row.config,
  };
}

/** Get the default provider (or first enabled if none marked default). */
export async function getDefaultProvider(): Promise<AiProviderConfig | null> {
  await ensureProviderTable();
  
  // Try to get explicitly marked default
  const [defaultRow] = await db
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.isDefault, 1))
    .limit(1);
  
  if (defaultRow) {
    return {
      ...PROVIDER_DEFAULTS[defaultRow.id as AiProviderKey],
      ...defaultRow.config,
    };
  }
  
  // Fall back to first enabled
  const configs = await getAllProviderConfigs();
  return configs.find((c) => c.enabled) || null;
}

/** Save or update a provider config. */
export async function saveProviderConfig(
  key: AiProviderKey,
  config: Partial<AiProviderConfig>,
  markAsDefault = false
): Promise<void> {
  await ensureProviderTable();
  
  const existing = await getProviderConfig(key);
  const merged: AiProviderConfig = {
    ...(existing || PROVIDER_DEFAULTS[key]),
    ...config,
    key,
  } as AiProviderConfig;
  
  // Clear default flag from others if marking this as default
  if (markAsDefault) {
    await db
      .update(aiProviderConfigs)
      .set({ isDefault: 0 })
      .where(eq(aiProviderConfigs.isDefault, 1));
  }
  
  await db
    .insert(aiProviderConfigs)
    .values({
      id: key,
      config: merged,
      isDefault: markAsDefault ? 1 : 0,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: aiProviderConfigs.id,
      set: {
        config: merged,
        isDefault: markAsDefault ? 1 : undefined,
        updatedAt: new Date(),
      },
    });
}

/** Delete a provider config. */
export async function deleteProviderConfig(key: AiProviderKey): Promise<void> {
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.id, key));
}

/** Get public-safe provider info (no API keys). */
export async function getPublicProviderState(): Promise<
  Array<{
    key: AiProviderKey;
    name: string;
    enabled: boolean;
    isDefault: boolean;
    model: string;
    hasKey: boolean;
  }>
> {
  const configs = await getAllProviderConfigs();
  
  // Also include defaults for providers not yet configured
  const allKeys = Object.keys(PROVIDER_DEFAULTS) as AiProviderKey[];
  const configuredKeys = new Set(configs.map((c) => c.key));
  
  const allConfigs = [
    ...configs,
    ...allKeys
      .filter((k) => !configuredKeys.has(k))
      .map((k) => ({ ...PROVIDER_DEFAULTS[k], key: k, enabled: false } as AiProviderConfig)),
  ];
  
  return allConfigs.map((c) => ({
    key: c.key,
    name: c.name,
    enabled: c.enabled,
    isDefault: false, // computed separately
    model: c.model,
    hasKey: !!c.apiKey,
  }));
}
