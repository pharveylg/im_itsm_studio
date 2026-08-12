/**
 * AI Provider management API.
 * Supports listing, configuring, and health-checking AI providers.
 */

import { NextResponse } from "next/server";
import {
  deleteProviderConfig,
  getAllProviderConfigs,
  getPublicProviderState,
  saveProviderConfig,
} from "@/lib/ai-provider-store";
import { checkProviderHealth } from "@/lib/ai-adapters";
import type { AiProviderConfig, AiProviderKey } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: List all providers (public-safe) or detailed configs (with API keys hidden) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const health = searchParams.get("health") === "true";
    
    const providers = await getPublicProviderState();
    
    if (health) {
      // Run health checks on enabled providers
      const configs = await getAllProviderConfigs();
      const healthChecks = await Promise.all(
        configs
          .filter((c) => c.enabled)
          .map(async (config) => ({
            key: config.key,
            ...(await checkProviderHealth(config)),
            lastChecked: new Date(),
          }))
      );
      
      return NextResponse.json({
        providers,
        health: healthChecks,
      });
    }
    
    return NextResponse.json({ providers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch providers" },
      { status: 500 }
    );
  }
}

/** POST: Save/update a provider configuration */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      key: AiProviderKey;
      config: Partial<AiProviderConfig>;
      setDefault?: boolean;
    };

    if (!body.key) {
      return NextResponse.json({ ok: false, error: "Provider key required" }, { status: 400 });
    }

    await saveProviderConfig(body.key, body.config, body.setDefault);
    
    return NextResponse.json({ ok: true, key: body.key });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save provider" },
      { status: 500 }
    );
  }
}

/** DELETE: Remove a provider configuration */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") as AiProviderKey;
    
    if (!key) {
      return NextResponse.json({ ok: false, error: "Provider key required" }, { status: 400 });
    }

    await deleteProviderConfig(key);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete provider" },
      { status: 500 }
    );
  }
}
