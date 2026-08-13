import { NextResponse } from "next/server";
import { getGithubConfig, saveGithubConfig } from "@/lib/github-sync";

export async function GET() {
  try {
    const config = await getGithubConfig();
    return NextResponse.json({
      ok: true,
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      hasPat: !!config.pat,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get config";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await saveGithubConfig({
      owner: body.owner,
      repo: body.repo,
      branch: body.branch,
      pat: body.pat,
      keepPat: body.keepPat,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save config";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}