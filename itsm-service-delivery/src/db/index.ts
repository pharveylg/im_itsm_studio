import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __itsmPostgresqlPool?: Pool;
};

/**
 * Supabase requires SSL in production and uses pgBouncer on port 6543
 * for connection pooling. The pool is configured to work in both local
 * dev (no SSL, standard port) and Supabase/Vercel (SSL, pooled port).
 */
export const pool =
  globalForDb.__itsmPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Supabase needs SSL in production; skip locally
    ssl: databaseUrl.includes("supabase.co") || databaseUrl.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : process.env.NODE_ENV === "production" && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1")
        ? { rejectUnauthorized: false }
        : undefined,
    // Vercel serverless: keep the pool small
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: process.env.VERCEL ? 10_000 : 30_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__itsmPostgresqlPool = pool;
}

export const db = drizzle(pool);
