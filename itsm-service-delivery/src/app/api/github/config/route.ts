import { NextResponse } from "next/server";
import { getGithubConfig, saveGithubConfig, syncGithubRepository } from "@/lib/github-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getGithubConfig();
  return NextResponse.json({
    ok: true,
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    hasPat: !!config.pat,
    updatedAt: config.updatedAt,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      owner: string;
      repo: string;
      branch: string;
      pat?: string;
      keepPat?: boolean;
    };

    if (!body.owner || !body.repo) {
      return NextResponse.json({ ok: false, error: "Owner and repository are required." }, { status: 400 });
    }

    await saveGithubConfig(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save configuration" },
      { status: 500 }
    );
  }
}
