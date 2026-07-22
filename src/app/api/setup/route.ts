/**
 * Database bootstrap and diagnostic endpoint.
 * Creates all required tables if they don't exist and reports status.
 */

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
      use_count integer DEFAULT 0,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
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

export async function GET() {
  try {
    // Test basic connectivity
    await db.execute(sql`SELECT 1 AS health_check`);

    const results: TableStatus[] = [];

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

    return NextResponse.json({
      ok: allReady,
      database: "connected",
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
