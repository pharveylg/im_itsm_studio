/**
 * GitHub repository synchronization for governance guidelines.
 */

import { NextResponse } from "next/server";
import { syncGithubRepository } from "@/lib/github-sync";

export async function POST() {
  try {
    const result = await syncGithubRepository();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncGithubRepository();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}