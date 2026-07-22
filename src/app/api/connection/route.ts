import { NextResponse } from "next/server";
import {
  getConnectionState,
  saveConnectionSettings,
  validateSettings,
  type ConnectionSettings,
} from "@/lib/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getConnectionState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  let body: Partial<ConnectionSettings>;
  try {
    body = (await request.json()) as Partial<ConnectionSettings>;
  } catch {
    return NextResponse.json({ ok: false, errors: ["Invalid JSON payload."] }, { status: 400 });
  }

  const settings: ConnectionSettings = {
    instanceUrl: body.instanceUrl ?? "",
    clientId: body.clientId ?? "",
    clientSecret: body.clientSecret ?? null,
    keepSecret: Boolean(body.keepSecret),
    redirectUri: body.redirectUri ?? "",
    authMethod: (body.authMethod as ConnectionSettings["authMethod"]) ?? "pkce",
    scope: body.scope ?? "useraccount",
  };

  const errors = validateSettings(settings);
  if (errors.length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  await saveConnectionSettings(settings);
  const state = await getConnectionState();
  return NextResponse.json({ ok: true, state });
}
