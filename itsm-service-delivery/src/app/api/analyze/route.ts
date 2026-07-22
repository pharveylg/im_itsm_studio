import { NextResponse } from "next/server";
import {
  buildGuidelineBundle,
  type GuidelineDocumentInput,
} from "@/lib/document-extract";
import {
  analysisSystemPrompt,
  analysisUserPrompt,
  buildAnalysisContext,
  type XmlDocumentInput,
} from "@/lib/xml-analysis";
import type { ItsmModuleKey } from "@/lib/itsm-modules";
import { callProvider, estimateCost } from "@/lib/ai-adapters";
import {
  getDefaultProvider,
  getProviderConfig,
} from "@/lib/ai-provider-store";
import type { AiProviderKey } from "@/lib/ai-providers";
import {
  buildBundleFromSources,
  markGuidelineUsed,
} from "@/lib/guidelines-store";
import {
  buildCommunicationsContext,
  miCommsSystemPrompt,
  miCommsUserPrompt,
  type AnalysisMode,
  type EmailDocumentInput,
} from "@/lib/mi-comms-analysis";

type AnalyzeRequest = {
  documents?: XmlDocumentInput[];
  guidelines?: string;
  guidelineDocuments?: GuidelineDocumentInput[];
  guidelineIds?: string[];
  emailDocuments?: EmailDocumentInput[];
  analysisMode?: AnalysisMode;
  scopedModules?: ItsmModuleKey[];
  focus?: string;
  includeRaw?: boolean;
  provider?: AiProviderKey;
  model?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel Pro: allow up to 2 min for large AI calls

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const documents = (body.documents ?? [])
      .filter((document) => document && typeof document.name === "string" && typeof document.xml === "string")
      .slice(0, 12);

    if (!documents.length) {
      return NextResponse.json({ ok: false, error: "Add at least one ServiceNow XML extract before analyzing." }, { status: 400 });
    }

    const analysisMode: AnalysisMode = body.analysisMode === "mi_comms" ? "mi_comms" : "itsm";
    if (analysisMode === "mi_comms" && !body.emailDocuments?.length) {
      return NextResponse.json(
        { ok: false, error: "MI Comms Analysis requires at least one email export (MSG, EML, HTML, or TXT)." },
        { status: 400 },
      );
    }
    if (analysisMode === "mi_comms" && !body.guidelineIds?.length) {
      return NextResponse.json(
        { ok: false, error: "MI Comms Analysis requires a stored governance guideline so SLA targets and cadence are evidence-based." },
        { status: 400 },
      );
    }

    // Build guideline bundle from stored IDs, ad-hoc documents, and freeform text
    let guidelineBundle: { text: string; sourceIds: string[] };
    
    if (body.guidelineIds?.length || body.guidelineDocuments?.length) {
      guidelineBundle = await buildBundleFromSources({
        storedIds: body.guidelineIds,
        freeformText: body.guidelines,
        adhocDocuments: body.guidelineDocuments,
      });
      // Mark stored guidelines as used
      for (const id of guidelineBundle.sourceIds) {
        await markGuidelineUsed(id);
      }
    } else {
      // Fallback to just freeform text
      guidelineBundle = {
        text: body.guidelines?.trim() || "Apply standard ITSM analysis discipline.",
        sourceIds: [],
      };
    }

    const context = buildAnalysisContext(documents, Boolean(body.includeRaw));
    const communications = analysisMode === "mi_comms"
      ? await buildCommunicationsContext(body.emailDocuments ?? [])
      : null;
    const publicContext = {
      documents: context.documents.map(({ rawExcerpt, importantFields, ...document }) => ({ ...document, importantFields })),
      totalBytes: context.totalBytes,
      totalNodes: context.totalNodes,
      totalRecords: context.totalRecords,
      detectedModules: context.detectedModules,
      coveredModules: context.coveredModules,
      missingModules: context.missingModules,
    };
    const publicGuidelines = {
      characters: guidelineBundle.text.length,
      sourceIds: guidelineBundle.sourceIds,
    };

    // Select provider: explicit > default
    let providerConfig = body.provider
      ? await getProviderConfig(body.provider)
      : await getDefaultProvider();

    if (!providerConfig || !providerConfig.enabled) {
      // Check if we have any provider at all
      const allProviders = await getProviderConfig("openai")
        .then(c => c)
        .catch(() => null);
      
      if (!allProviders) {
        return NextResponse.json({
          ok: false,
          configured: false,
          error: "No AI provider configured. Add at least one provider in AI Provider Settings.",
          context: publicContext,
          guidelines: publicGuidelines,
        }, { status: 503 });
      }
      
      providerConfig = allProviders;
    }

    // Allow model override
    if (body.model?.trim()) {
      providerConfig = { ...providerConfig, model: body.model.trim() };
    }

    // Resolve scoped modules (empty = all modules)
    const scopedModules = body.scopedModules?.length ? body.scopedModules : undefined;

    // Prepare the analysis request. MI Comms uses a governance-specific report contract.
    const analysisRequest = analysisMode === "mi_comms" && communications
      ? {
          systemPrompt: miCommsSystemPrompt(),
          userPrompt: miCommsUserPrompt({
            guidelines: guidelineBundle.text,
            focus: body.focus,
            itsmContext: body.includeRaw ? context.rawContext : context.structuredContext,
            communications,
          }),
          temperature: providerConfig.temperature,
          maxTokens: providerConfig.maxTokens,
          documentCount: documents.length + communications.emails.length,
          estimatedTokens: Math.ceil(
            (guidelineBundle.text.length + JSON.stringify(context).length + communications.promptContext.length) / 4,
          ),
        }
      : {
          systemPrompt: analysisSystemPrompt(scopedModules),
          userPrompt: analysisUserPrompt(
            guidelineBundle.text,
            body.focus ?? "",
            context,
            Boolean(body.includeRaw),
            scopedModules,
          ),
          temperature: providerConfig.temperature,
          maxTokens: providerConfig.maxTokens,
          documentCount: documents.length,
          estimatedTokens: Math.ceil((guidelineBundle.text.length + JSON.stringify(context).length) / 4),
        };

    // Call the selected provider
    const result = await callProvider(providerConfig, analysisRequest);

    // Calculate cost estimate
    const costEstimate = result.usage
      ? estimateCost(result.provider, result.model, result.usage.promptTokens, result.usage.completionTokens)
      : undefined;

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      analysis: result.text,
      analysisMode,
      scopedModules: scopedModules ?? null,
      context: publicContext,
      communications: communications
        ? {
            emailCount: communications.emails.length,
            totalBytes: communications.totalBytes,
            firstCommunicationAt: communications.firstCommunicationAt,
            lastCommunicationAt: communications.lastCommunicationAt,
            stakeholderCount: communications.stakeholderAddresses.length,
            emails: communications.emails.map(({ body: _body, ...email }) => email),
          }
        : null,
      guidelines: publicGuidelines,
      usage: result.usage,
      latencyMs: result.latencyMs,
      costEstimateUsd: costEstimate,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to analyze XML extracts.",
    }, { status: 400 });
  }
}
