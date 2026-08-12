/**
 * Database bootstrap and diagnostic endpoint.
 * Creates all required tables if they don't exist and reports status.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_TABLES = [
  {
    name: "connection_config",
    create: `CREATE TABLE IF NOT EXISTS connection_config (
      id integer PRIMARY KEY DEFAULT 1,
      instance_url text NOT NULL,
      client_id text NOT NULL DEFAULT '',
      client_secret text,
      redirect_uri text NOT NULL DEFAULT '',
      auth_method text NOT NULL DEFAULT 'pkce',
      scope text NOT NULL DEFAULT 'useraccount',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "ai_provider_configs",
    create: `CREATE TABLE IF NOT EXISTS ai_provider_configs (
      id text PRIMARY KEY,
      config jsonb NOT NULL,
      is_default integer DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "stored_guidelines",
    create: `CREATE TABLE IF NOT EXISTS stored_guidelines (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      description text,
      original_filename text NOT NULL,
      content_type text NOT NULL,
      extracted_text text NOT NULL,
      file_size_bytes integer NOT NULL,
      word_count integer DEFAULT 0,
      source_repo text,
      source_path text,
      source_sha text,
      use_count integer DEFAULT 0,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "github_config",
    create: `CREATE TABLE IF NOT EXISTS github_config (
      id integer PRIMARY KEY DEFAULT 1,
      owner text NOT NULL,
      repo text NOT NULL,
      branch text NOT NULL DEFAULT 'main',
      pat text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "guideline_upload_chunks",
    create: `CREATE TABLE IF NOT EXISTS guideline_upload_chunks (
      upload_id text NOT NULL,
      chunk_index integer NOT NULL,
      total_chunks integer NOT NULL,
      content_base64 text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (upload_id, chunk_index)
    )`,
  },
];

type TableStatus = {
  name: string;
  exists: boolean;
  created: boolean;
  error?: string;
};

type DatabaseIdentity = {
  provider: "local" | "supabase" | "managed" | "unknown";
  label: string;
  database: string;
  fingerprint: string;
};

function databaseIdentity(): DatabaseIdentity {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL ||
    "";
  const fingerprint = createHash("sha256").update(connectionString).digest("hex").slice(0, 10);

  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const database = url.pathname.replace(/^\//, "") || "postgres";
    if (host === "localhost" || host === "127.0.0.1") {
      return { provider: "local", label: "Local PostgreSQL", database, fingerprint };
    }
    if (host.includes("supabase")) {
      return { provider: "supabase", label: "Supabase PostgreSQL", database, fingerprint };
    }
    return { provider: "managed", label: "Managed PostgreSQL", database, fingerprint };
  } catch {
    return { provider: "unknown", label: "Database URL unavailable", database: "unknown", fingerprint };
  }
}

export async function GET() {
  try {
    // Test basic connectivity
    await db.execute(sql`SELECT 1 AS health_check`);

    const results: TableStatus[] = [];

    // Safely add columns to stored_guidelines if it already exists (migration)
    try {
      await db.execute(sql`ALTER TABLE stored_guidelines ADD COLUMN IF NOT EXISTS source_repo text`);
      await db.execute(sql`ALTER TABLE stored_guidelines ADD COLUMN IF NOT EXISTS source_path text`);
      await db.execute(sql`ALTER TABLE stored_guidelines ADD COLUMN IF NOT EXISTS source_sha text`);
    } catch {
      // Ignore errors if table doesn't exist yet
    }

    for (const table of ALL_TABLES) {
      try {
        // Check if table exists
        const check = await db.execute(
          sql`SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${table.name}
          ) AS exists`
        );
        const exists = Boolean((check.rows[0] as { exists: boolean })?.exists);

        if (!exists) {
          // Create the table
          await db.execute(sql.raw(table.create));
          results.push({ name: table.name, exists: false, created: true });
        } else {
          results.push({ name: table.name, exists: true, created: false });
        }
      } catch (error) {
        results.push({
          name: table.name,
          exists: false,
          created: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const allReady = results.every((r) => r.exists || r.created);
    let guidelineCount = 0;
    if (allReady) {
      const countResult = await db.execute(sql`SELECT count(*)::int AS count FROM stored_guidelines`);
      guidelineCount = Number((countResult.rows[0] as { count?: number })?.count ?? 0);
    }

    return NextResponse.json({
      ok: allReady,
      database: "connected",
      identity: databaseIdentity(),
      guidelineCount,
      tables: results,
      message: allReady
        ? "All tables ready. The application is fully configured."
        : "Some tables could not be created. Check the Supabase permissions and DATABASE_URL.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isConnection = /connect|ECONNREFUSED|timeout|ssl|password|DATABASE_URL/i.test(message);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        identity: databaseIdentity(),
        guidelineCount: 0,
        tables: [],
        message: isConnection
          ? `Cannot connect to the database. Verify DATABASE_URL is set in Vercel environment variables. Details: ${message}`
          : `Database error: ${message}`,
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  // POST forces a fresh bootstrap (create all missing tables)
  return GET();
}
