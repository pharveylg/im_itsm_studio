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

  const [row] = await db
    .insert(storedGuidelines)
    .values({
      id,
      name: input.name,
      description: input.description ?? null,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      extractedText: input.extractedText,
      fileSizeBytes: input.fileSizeBytes,
      wordCount,
      oasId: input.oasId ?? null,
      oasVersion: input.oasVersion ?? null,
      structuredFormat: input.structuredFormat ?? "4-area",
      sourceRepo: input.sourceRepo ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceSha: input.sourceSha ?? null,
    })
    .returning();

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

/** Update a guideline's metadata. */
export async function updateGuideline(
  id: string,
  updates: { name?: string; description?: string }
): Promise<StoredGuideline | null> {
  await ensureGuidelinesTable();

  const [row] = await db
    .update(storedGuidelines)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(storedGuidelines.id, id))
    .returning();

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

/** Delete a guideline. */
export async function deleteGuideline(id: string): Promise<boolean> {
  await ensureGuidelinesTable();
  await db.delete(storedGuidelines).where(eq(storedGuidelines.id, id));
  return true;
}

/** Increment use count and update lastUsedAt. */
export async function markGuidelineUsed(id: string): Promise<void> {
  await ensureGuidelinesTable();
  await db
    .update(storedGuidelines)
    .set({ useCount: sql`${storedGuidelines.useCount} + 1`, lastUsedAt: new Date() })
    .where(eq(storedGuidelines.id, id));
}

/** Build a guideline bundle from stored IDs + optional freeform text + optional ad-hoc documents. */
export async function syncGithubRepository(): Promise<SyncResult> {
  const logs: string[] = [];
  const log = (msg: string) => { console.log(`[GitHub Sync] ${msg}`); logs.push(msg); };

  try {
    const config = await getGithubConfig();
    if (!config.owner || !config.repo || !config.pat) {
      return { ok: false, added: 0, updated: 0, removed: 0, skipped: 0, error: "GitHub configuration is incomplete.", logs };
    }

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ITSM-Analysis-Studio",
    };

    const repoRef = `${config.owner}/${config.repo}`;
    log(`Starting sync for ${repoRef}`);

    const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers });
    if (!treeRes.ok) throw new Error(`GitHub API error: ${treeRes.status}`);

    const treeData: any = await treeRes.json();
    const supported = [".xml", ".docx", ".pdf", ".txt", ".md", ".markdown"];

    const files = (treeData.tree ?? []).filter((f: any) =>
      f.type === "blob" && supported.some(ext => f.path.toLowerCase().endsWith(ext))
    );

    log(`Found ${files.length} supported files.`);

    let added = 0, updated = 0, skipped = 0;

    for (const file of files) {
      const filename = file.path.split("/").pop() ?? "unnamed";
      const name = filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");

      const ext = filename.toLowerCase().split(".").pop() ?? "";
      let contentType = "text/plain";
      if (ext === "pdf") contentType = "application/pdf";
      if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (ext === "xml") contentType = "text/xml";

      try {
        const blobRes = await fetch(file.url, { headers });
        const blob: any = await blobRes.json();

        const extracted = await extractGuidelineDocument({
          name: filename,
          contentType,
          content: blob.content,
          encoding: "base64",
        });

        const size = file.size ?? Math.floor((blob.content.length * 3) / 4);

        await storeGuideline({
          name,
          description: `Synced from GitHub: ${file.path}`,
          originalFilename: filename,
          contentType,
          extractedText: extracted.text,
          fileSizeBytes: size,
        });

        added++;
        log(`Added: ${file.path}`);
      } catch (e) {
        log(`Failed: ${file.path}`);
      }
    }

    return { ok: true, added, updated, removed: 0, skipped, logs };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    return { ok: false, added: 0, updated: 0, removed: 0, skipped: 0, error: msg, logs };
  }
}