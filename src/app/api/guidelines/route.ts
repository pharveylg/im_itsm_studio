/**
 * Guidelines management API.
 * Supports listing, creating, updating, and deleting stored guidelines.
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

/** POST: Store a new guideline from uploaded file. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      filename: string;
      contentType?: string;
      encoding?: "utf8" | "base64";
      content: string;
    };

    if (!body.name || !body.filename || !body.content) {
      return NextResponse.json(
        { ok: false, error: "Name, filename, and content are required." },
        { status: 400 }
      );
    }

    // Extract text from the document
    const extracted = await extractGuidelineDocument({
      name: body.filename,
      contentType: body.contentType,
      content: body.content,
      encoding: body.encoding,
    });

    const guideline = await storeGuideline({
      name: body.name,
      description: body.description,
      originalFilename: body.filename,
      contentType: body.contentType ?? "application/octet-stream",
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
