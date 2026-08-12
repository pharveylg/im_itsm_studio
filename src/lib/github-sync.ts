/**
 * GitHub repository synchronization for governance guidelines.
 */

import { db } from "@/db";
import { githubConfig, storedGuidelines } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { extractGuidelineDocument } from "./document-extract";
import { storeGuideline } from "./guidelines-store";
import { randomUUID } from "node:crypto";

export type GithubConfig = {
  owner: string;
  repo: string;
  branch: string;
  pat: string | null;
  updatedAt: string | null;
};

export type SyncResult = {
  ok: boolean;
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  error?: string;
  logs: string[];
};

export async function ensureGithubTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS github_config (
      id integer PRIMARY KEY DEFAULT 1,
      owner text NOT NULL,
      repo text NOT NULL,
      branch text NOT NULL DEFAULT 'main',
      pat text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function getGithubConfig(): Promise<GithubConfig> {
  try {
    await ensureGithubTable();
    const [row] = await db.select().from(githubConfig).where(eq(githubConfig.id, 1)).limit(1);
    if (!row) {
      return { owner: "", repo: "", branch: "main", pat: null, updatedAt: null };
    }
    return {
      owner: row.owner,
      repo: row.repo,
      branch: row.branch,
      pat: row.pat,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return { owner: "", repo: "", branch: "main", pat: null, updatedAt: null };
  }
}

export async function saveGithubConfig(
  input: { owner: string; repo: string; branch: string; pat?: string; keepPat?: boolean }
): Promise<void> {
  await ensureGithubTable();
  const [existing] = await db.select().from(githubConfig).where(eq(githubConfig.id, 1)).limit(1);

  let pat = input.pat?.trim() || null;
  if (!pat && input.keepPat && existing) {
    pat = existing.pat;
  }

  const values = {
    owner: input.owner.trim(),
    repo: input.repo.trim(),
    branch: input.branch.trim() || "main",
    pat,
    updatedAt: new Date(),
  };

  await db
    .insert(githubConfig)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: githubConfig.id, set: values });
}

export async function syncGithubRepository(): Promise<SyncResult> {
  const logs: string[] = [];
  const log = (msg: string) => { console.log(`[GitHub Sync] ${msg}`); logs.push(msg); };
  
  try {
    const config = await getGithubConfig();
    if (!config.owner || !config.repo || !config.pat) {
      return { ok: false, added: 0, updated: 0, removed: 0, skipped: 0, error: "GitHub configuration is incomplete or missing PAT.", logs };
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ITSM-Analysis-Studio",
    };

    const repoRef = `${config.owner}/${config.repo}`;
    log(`Starting sync for ${repoRef}@${config.branch}`);

    // 1. Get the repository tree recursively
    const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;
    const treeResponse = await fetch(treeUrl, { headers });
    
    if (!treeResponse.ok) {
      if (treeResponse.status === 404) {
        throw new Error(`Repository or branch not found. Check permissions and branch name.`);
      }
      if (treeResponse.status === 401) {
        throw new Error(`Authentication failed. Check if the PAT has correct permissions.`);
      }
      throw new Error(`GitHub API error: ${treeResponse.status} ${await treeResponse.text()}`);
    }

    const treeData = await treeResponse.json() as { tree?: Array<{ path: string, mode: string, type: string, sha: string, size?: number, url: string }>, truncated?: boolean };
    
    if (treeData.truncated) {
      log("Warning: Repository tree was truncated by GitHub API limit.");
    }

    // Supported extensions matching the existing upload logic
    const supportedExts = [".xml", ".docx", ".pdf", ".txt", ".md", ".markdown"];
    
    const validFiles = (treeData.tree ?? []).filter(item => 
      item.type === "blob" && 
      supportedExts.some(ext => item.path.toLowerCase().endsWith(ext))
    );

    log(`Found ${validFiles.length} supported documents in tree.`);

    // 2. Load existing guidelines from this repo
    const existingRows = await db
      .select({ id: storedGuidelines.id, sourcePath: storedGuidelines.sourcePath, sourceSha: storedGuidelines.sourceSha })
      .from(storedGuidelines)
      .where(eq(storedGuidelines.sourceRepo, repoRef));

    const existingMap = new Map(existingRows.map(r => [r.sourcePath, { id: r.id, sha: r.sourceSha }]));

    let added = 0, updated = 0, removed = 0, skipped = 0;

    // 3. Process each file
    const activePaths = new Set<string>();

    for (const file of validFiles) {
      activePaths.add(file.path);
      const existing = existingMap.get(file.path);

      if (existing && existing.sha === file.sha) {
        skipped++;
        continue;
      }

      log(`Fetching: ${file.path}`);
      
      // Fetch blob
      const blobResponse = await fetch(file.url, { headers });
      if (!blobResponse.ok) {
        log(`Failed to fetch blob for ${file.path}: ${blobResponse.status}`);
        continue;
      }

      const blobData = await blobResponse.json() as { content: string, encoding: string };
      
      if (blobData.encoding !== "base64") {
        log(`Unsupported encoding ${blobData.encoding} for ${file.path}`);
        continue;
      }

      const ext = file.path.toLowerCase().split(".").pop() ?? "";
      const isBinary = ext === "pdf" || ext === "docx";
      let contentType = "application/octet-stream";
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (ext === "xml") contentType = "text/xml";
      else if (ext === "md" || ext === "markdown" || ext === "txt") contentType = "text/plain";

      const filename = file.path.split("/").pop() ?? "unnamed";
      const name = filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");

      try {
        const extracted = await extractGuidelineDocument({
          name: filename,
          contentType,
          content: blobData.content,
          encoding: "base64",
        });

        // Calculate file size from base64 string (approximate original size)
        const sizeBytes = file.size ?? Math.floor((blobData.content.length * 3) / 4);

        await storeGuideline({
          id: existing ? existing.id : randomUUID(),
          name,
          description: `Synced from ${repoRef}: ${file.path}`,
          originalFilename: filename,
          contentType,
          extractedText: extracted.text,
          fileSizeBytes: sizeBytes,
          sourceRepo: repoRef,
          sourcePath: file.path,
          sourceSha: file.sha,
        });

        if (existing) updated++;
        else added++;
        log(`Successfully ${existing ? "updated" : "added"}: ${file.path}`);

      } catch (err) {
        log(`Error processing ${file.path}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Remove files that no longer exist in the repo
    for (const [path, info] of existingMap.entries()) {
      if (!path || !activePaths.has(path)) {
        await db.delete(storedGuidelines).where(eq(storedGuidelines.id, info.id));
        log(`Removed deleted file: ${path}`);
        removed++;
      }
    }

    log(`Sync complete. Added: ${added}, Updated: ${updated}, Removed: ${removed}, Skipped: ${skipped}`);
    return { ok: true, added, updated, removed, skipped, logs };

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    log(`Sync failed: ${msg}`);
    return { ok: false, added: 0, updated: 0, removed: 0, skipped: 0, error: msg, logs };
  }
}
