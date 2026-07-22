import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { extractGuidelineDocument } from "@/lib/document-extract";
import { storeGuideline } from "@/lib/guidelines-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 12_000_000;
const MAX_CHUNK_BASE64_CHARS = 950_000;

async function ensureUploadTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guideline_upload_chunks (
      upload_id text NOT NULL,
      chunk_index integer NOT NULL,
      total_chunks integer NOT NULL,
      content_base64 text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (upload_id, chunk_index)
    )
  `);
  // Remove abandoned uploads automatically.
  await db.execute(sql`
    DELETE FROM guideline_upload_chunks
    WHERE created_at < now() - interval '24 hours'
  `);
}

export async function POST(request: Request) {
  try {
    // Ensure we can connect to the DB and the table exists
    try {
      await ensureUploadTable();
    } catch (dbError) {
      console.error("Database connection/table error:", dbError);
      return NextResponse.json({
        ok: false,
        error: `Database Error: ${dbError instanceof Error ? dbError.message : String(dbError)}. Check Vercel DATABASE_URL.`,
      }, { status: 503 });
    }

    const body = await request.json();

    if (body.action === "init") {
      if (!Number.isFinite(body.fileSize) || body.fileSize <= 0) {
        return NextResponse.json({ ok: false, error: "The selected file is empty." }, { status: 400 });
      }
      if (body.fileSize > MAX_FILE_BYTES) {
        return NextResponse.json(
          { ok: false, error: `File exceeds the ${MAX_FILE_BYTES / 1_000_000} MB guideline limit.` },
          { status: 413 },
        );
      }
      if (!Number.isInteger(body.totalChunks) || body.totalChunks < 1 || body.totalChunks > 32) {
        return NextResponse.json({ ok: false, error: "Invalid upload chunk count." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, uploadId: randomUUID() });
    }

    if (body.action === "chunk") {
      if (!body.uploadId || !Number.isInteger(body.index) || body.index < 0) {
        return NextResponse.json({ ok: false, error: "Invalid upload chunk." }, { status: 400 });
      }
      if (!body.contentBase64 || body.contentBase64.length > MAX_CHUNK_BASE64_CHARS) {
        return NextResponse.json({ ok: false, error: "Upload chunk is too large." }, { status: 413 });
      }
      await db.execute(sql`
        INSERT INTO guideline_upload_chunks (
          upload_id, chunk_index, total_chunks, content_base64
        ) VALUES (
          ${body.uploadId}, ${body.index}, ${body.totalChunks}, ${body.contentBase64}
        )
        ON CONFLICT (upload_id, chunk_index)
        DO UPDATE SET
          content_base64 = EXCLUDED.content_base64,
          total_chunks = EXCLUDED.total_chunks,
          created_at = now()
      `);
      return NextResponse.json({ ok: true, received: body.index });
    }

    if (body.action === "cancel") {
      await db.execute(sql`
        DELETE FROM guideline_upload_chunks WHERE upload_id = ${body.uploadId}
      `);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "complete") {
      if (!body.name?.trim() || !body.filename || !body.uploadId) {
        return NextResponse.json({ ok: false, error: "Guideline name and file are required." }, { status: 400 });
      }

      const result = await db.execute(sql`
        SELECT chunk_index, total_chunks, content_base64
        FROM guideline_upload_chunks
        WHERE upload_id = ${body.uploadId}
        ORDER BY chunk_index ASC
      `);
      const rows = result.rows as Array<{
        chunk_index: number;
        total_chunks: number;
        content_base64: string;
      }>;

      if (rows.length !== body.totalChunks) {
        return NextResponse.json(
          { ok: false, error: `Upload incomplete: received ${rows.length} of ${body.totalChunks} chunks.` },
          { status: 409 },
        );
      }
      
      const buffers = rows.map((row) => Buffer.from(row.content_base64, "base64"));
      const fileBuffer = Buffer.concat(buffers);
      
      if (fileBuffer.byteLength !== body.fileSize) {
        return NextResponse.json(
          { ok: false, error: "Uploaded file size did not match the source file. Try again." },
          { status: 409 },
        );
      }

      const filename = body.filename.trim();
      const ext = filename.toLowerCase().split(".").pop() ?? "";
      const binary = ext === "pdf" || ext === "docx";
      
      const extracted = await extractGuidelineDocument({
        name: filename,
        contentType: body.contentType || "application/octet-stream",
        content: binary ? fileBuffer.toString("base64") : fileBuffer.toString("utf8"),
        encoding: binary ? "base64" : "utf8",
      });

      const guideline = await storeGuideline({
        name: body.name.trim(),
        description: body.description?.trim() || undefined,
        originalFilename: filename,
        contentType: body.contentType || "application/octet-stream",
        extractedText: extracted.text,
        fileSizeBytes: fileBuffer.byteLength,
      });

      await db.execute(sql`
        DELETE FROM guideline_upload_chunks WHERE upload_id = ${body.uploadId}
      `);

      return NextResponse.json({
        ok: true,
        guideline,
        extraction: {
          kind: extracted.summary.kind,
          characters: extracted.summary.characters,
          wordCount: extracted.summary.wordCount,
          warnings: extracted.summary.warnings,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Unsupported upload action." }, { status: 400 });
  } catch (error) {
    console.error("Guideline chunk upload failed", error);
    const message = error instanceof Error ? error.message : "Guideline upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}