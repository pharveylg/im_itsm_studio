/**
 * Guidelines management API.
 * Supports listing, creating, updating, and deleting stored guidelines.
 * POST uses FormData (multipart) to handle large files without JSON body limits.
 */

import { NextResponse } from "next/server";
import {
  deleteGuideline,
  listGuidelines,
  storeGuideline,
  updateGuideline,
} from "@/lib/guidelines-store";
import { extractGuidelineDocument } from "@/lib/document-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET: List all stored guidelines. */
export async function GET() {
  try {
    const guidelines = await listGuidelines();
    return NextResponse.json({ ok: true, guidelines });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to list guidelines" },
      { status: 500 }
    );
  }
}

/** POST: Store a new guideline. Accepts both FormData (multipart) and JSON. */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let name: string;
    let description: string | undefined;
    let filename: string;
    let fileContentType: string;
    let encoding: "utf8" | "base64";
    let content: string;

    if (contentType.includes("multipart/form-data")) {
      // ── FormData upload (preferred for large files) ──
      const form = await request.formData();
      name = String(form.get("name") ?? "").trim();
      description = (form.get("description") as string | null)?.trim() || undefined;
      const file = form.get("file") as File | null;

      if (!name) {
        return NextResponse.json({ ok: false, error: "Give this guideline a name." }, { status: 400 });
      }
      if (!file || file.size === 0) {
        return NextResponse.json({ ok: false, error: "Select a file to upload." }, { status: 400 });
      }
      if (file.size > 8_000_000) {
        return NextResponse.json({ ok: false, error: "File exceeds 8 MB limit." }, { status: 400 });
      }

      filename = file.name;
      fileContentType = file.type || "application/octet-stream";

      // Detect binary vs text
      const ext = filename.toLowerCase().split(".").pop() ?? "";
      const isBinary = ext === "pdf" || ext === "docx" || ext === "doc"
        || fileContentType.includes("pdf")
        || fileContentType.includes("wordprocessingml");

      if (isBinary) {
        const buffer = await file.arrayBuffer();
        content = Buffer.from(buffer).toString("base64");
        encoding = "base64";
      } else {
        content = await file.text();
        encoding = "utf8";
      }
    } else {
      // ── JSON fallback ──
      const body = (await request.json()) as {
        name: string;
        description?: string;
        filename: string;
        contentType?: string;
        encoding?: "utf8" | "base64";
        content: string;
      };
      name = body.name?.trim() ?? "";
      description = body.description;
      filename = body.filename;
      fileContentType = body.contentType ?? "application/octet-stream";
      encoding = body.encoding ?? "utf8";
      content = body.content;
    }

    if (!name || !filename || !content) {
      return NextResponse.json(
        { ok: false, error: "Name, filename, and content are required." },
        { status: 400 }
      );
    }

    // Extract text from the document
    const extracted = await extractGuidelineDocument({
      name: filename,
      contentType: fileContentType,
      content,
      encoding,
    });

    const guideline = await storeGuideline({
      name,
      description,
      originalFilename: filename,
      contentType: fileContentType,
      extractedText: extracted.text,
      fileSizeBytes: extracted.summary.bytes,
    });

    return NextResponse.json({ ok: true, guideline });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to store guideline" },
      { status: 400 }
    );
  }
}

/** PATCH: Update guideline metadata. */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id: string;
      name?: string;
      description?: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: "Guideline ID is required." },
        { status: 400 }
      );
    }

    const guideline = await updateGuideline(body.id, {
      name: body.name,
      description: body.description,
    });

    if (!guideline) {
      return NextResponse.json(
        { ok: false, error: "Guideline not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, guideline });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update guideline" },
      { status: 400 }
    );
  }
}

/** DELETE: Remove a guideline. */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Guideline ID is required." },
        { status: 400 }
      );
    }

    await deleteGuideline(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete guideline" },
      { status: 400 }
    );
  }
}
