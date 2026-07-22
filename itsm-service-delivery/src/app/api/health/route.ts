import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);

    // Also check if main tables exist
    const tableCheck = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('connection_config', 'ai_provider_configs', 'stored_guidelines', 'guideline_upload_chunks')
    `);

    const existingTables = tableCheck.rows.map((r) => (r as { table_name: string }).table_name);

    return Response.json({
      ok: true,
      tables: {
        connectionConfig: existingTables.includes("connection_config"),
        aiProviderConfigs: existingTables.includes("ai_provider_configs"),
        storedGuidelines: existingTables.includes("stored_guidelines"),
        guidelineUploadChunks: existingTables.includes("guideline_upload_chunks"),
      },
      allReady: existingTables.length === 4,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 500 },
    );
  }
}
