import { NextResponse } from "next/server";
import {
  buildGuidelineBundle,
  type GuidelineDocumentInput,
} from "@/lib/document-extract";
import {
  extractKnowledgeArticle,
  knowledgeSystemPrompt,
  knowledgeUserPrompt,
  type KnowledgeArticleInput,
} from "@/lib/knowledge-authoring";
import { callProvider } from "@/lib/ai-adapters";
import { getDefaultProvider } from "@/lib/ai-provider-store";
import type { AiProviderKey } from "@/lib/ai-providers";

type KnowledgeRequest = {
  article: KnowledgeArticleInput;
  styleGuideDocuments?: GuidelineDocumentInput[];
  styleGuideText?: string;
  sourceDocuments?: Array<{ name: string; xml: string }>;
  provider?: AiProviderKey;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as KnowledgeRequest;

    if (!body.article?.title || !body.article?.summary) {
      return NextResponse.json(
        { ok: false, error: "Article title and summary are required." },
        { status: 400 }
      );
    }

    // Build style guide from uploaded documents + freeform text
    const styleGuide = await buildGuidelineBundle({
      freeformText: body.styleGuideText ?? "",
      documents: body.styleGuideDocuments ?? [],
    });

    // Build source material context from optional XML extracts
    const sourceMaterial = (body.sourceDocuments ?? [])
      .map((doc) => `--- ${doc.name} ---\n${doc.xml.slice(0, 8000)}`)
      .join("\n\n");

    const articleInput: KnowledgeArticleInput = {
      ...body.article,
      sourceMaterial: sourceMaterial || undefined,
    };

    // Get provider
    const providerConfig = body.provider
      ? await (await import("@/lib/ai-provider-store")).getProviderConfig(body.provider)
      : await getDefaultProvider();

    if (!providerConfig || !providerConfig.enabled) {
      return NextResponse.json({
        ok: false,
        configured: false,
        error: "No AI provider configured. Add at least one provider in Settings.",
      }, { status: 503 });
    }

    // Call the provider
    const result = await callProvider(providerConfig, {
      systemPrompt: knowledgeSystemPrompt(),
      userPrompt: knowledgeUserPrompt(articleInput, styleGuide.text),
      temperature: providerConfig.temperature,
      maxTokens: providerConfig.maxTokens,
      documentCount: (body.sourceDocuments?.length ?? 0) + 1,
      estimatedTokens: Math.ceil((styleGuide.text.length + sourceMaterial.length) / 4),
    });

    // Extract the article from the response
    const article = extractKnowledgeArticle(result.text);

    if (!article) {
      // Fallback: wrap the raw response
      return NextResponse.json({
        ok: true,
        provider: result.provider,
        model: result.model,
        article: {
          title: body.article.title,
          summary: body.article.summary,
          body: `<div class="ai-output"><p>${result.text.replace(/\n/g, "</p><p>")}</p></div>`,
          metadata: {
            articleType: body.article.articleType,
            category: body.article.category,
            kbBase: body.article.kbBase,
            audience: body.article.audience,
            tags: [],
          },
        },
        raw: result.text,
        latencyMs: result.latencyMs,
        analyzedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      article,
      latencyMs: result.latencyMs,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to generate knowledge article.",
    }, { status: 400 });
  }
}
