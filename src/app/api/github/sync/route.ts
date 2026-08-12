import { NextResponse } from "next/server";
import { syncGithubRepository } from "@/lib/github-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel Pro: allow up to 2 min for large syncs

export async function POST() {
  try {
    const result = await syncGithubRepository();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sync failed unexpectedly." },
      { status: 500 }
    );
  }
}
