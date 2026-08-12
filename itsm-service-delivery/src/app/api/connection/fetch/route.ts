import { NextResponse } from "next/server";
import { fetchLiveRecordAsXml } from "@/lib/servicenow-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      module?: "incident" | "problem" | "change" | "knowledge" | "service_catalog";
      number?: string;
    };

    const module = body.module;
    const number = body.number?.trim();

    if (!module || !number) {
      return NextResponse.json(
        { ok: false, error: "ITSM Module and record number are required." },
        { status: 400 }
      );
    }

    const result = await fetchLiveRecordAsXml(module, number);

    return NextResponse.json({
      ok: true,
      filename: result.filename,
      xml: result.xml,
    });
  } catch (error) {
    console.error("Live ServiceNow sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ServiceNow sync failed" },
      { status: 400 }
    );
  }
}
