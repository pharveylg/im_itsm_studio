/**
 * Server-side storage for reusable guideline documents.
 */

import { db } from "@/db";
import { storedGuidelines } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export type StoredGuideline = {
  id: string;
  name: string;
  description: string | null;
  originalFilename: string;
  contentType: string;
  extractedText: string;
  fileSizeBytes: number;
  wordCount: number | null;

  // OAS Metadata
  oasId: string | null;
  oasVersion: string | null;
  structuredFormat: string | null;
  lastSyncedAt: string | null;

  // GitHub Sync Tracking
  sourceRepo: string | null;
  sourcePath: string | null;
  sourceSha: string | null;

  useCount: number | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Ensure the table exists (with all columns). */
export async function ensureGuidelinesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS stored_guidelines (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      description text,
      original_filename text NOT NULL,
      content_type text NOT NULL,
      extracted_text text NOT NULL,
      file_size_bytes integer NOT NULL,
      word_count integer DEFAULT 0,
      oas_id text,
      oas_version text,
      structured_format text DEFAULT '4-area',
      last_synced_at timestamptz,
      source_repo text,
      source_path text,
      source_sha text,
      use_count integer DEFAULT 0,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/** List all stored guidelines, most recently used first. */
export async function listGuidelines(): Promise<StoredGuideline[]> {
  await ensureGuidelinesTable();
  const rows = await db
    .select()
    .from(storedGuidelines)
    .orderBy(desc(storedGuidelines.lastUsedAt), desc(storedGuidelines.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    extractedText: row.extractedText,
    fileSizeBytes: row.fileSizeBytes,
    wordCount: row.wordCount,
    oasId: row.oasId ?? null,
    oasVersion: row.oasVersion ?? null,
    structuredFormat: row.structuredFormat ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    sourceRepo: row.sourceRepo ?? null,
    sourcePath: row.sourcePath ?? null,
    sourceSha: row.sourceSha ?? null,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/** Get a single guideline by ID. */
export async function getGuideline(id: string): Promise<StoredGuideline | null> {
  await ensureGuidelinesTable();
  const [row] = await db
    .select()
    .from(storedGuidelines)
    .where(eq(storedGuidelines.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    extractedText: row.extractedText,
    fileSizeBytes: row.fileSizeBytes,
    wordCount: row.wordCount,
    oasId: row.oasId ?? null,
    oasVersion: row.oasVersion ?? null,
    structuredFormat: row.structuredFormat ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    sourceRepo: row.sourceRepo ?? null,
    sourcePath: row.sourcePath ?? null,
    sourceSha: row.sourceSha ?? null,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Store a new guideline. */
export async function storeGuideline(input: {
  name: string;
  description?: string;
  originalFilename: string;
  contentType: string;
  extractedText: string;
  fileSizeBytes: number;
  oasId?: string;
  oasVersion?: string;
  structuredFormat?: string;
  sourceRepo?: string;
  sourcePath?: string;
  sourceSha?: string;
}): Promise<StoredGuideline> {
  await ensureGuidelinesTable();

  const id = randomUUID();
  const wordCount = input.extractedText
    ? input.extractedText.split(/\s+/).filter(Boolean).length
    : 0;

  const [row] = await 