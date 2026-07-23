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
import { ITSM_MODULES, CORE_ITSM_MODULE_KEYS, type ItsmModuleKey } from "@/lib/itsm-modules";
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

function replaceTaggedBlock(text: string, tag: string, content: string): string {
  const complete = new RegExp(`\\[${tag}\\][\\s\\S]*?\\[\\/${tag}\\]`, "i");
  const replacement = `[${tag}]\n${content.trim()}\n[/${tag}]`;
  if (complete.test(text)) return text.replace(complete, replacement);
  return `${text.trim()}\n\n${replacement}`;
}

function deterministicEvidenceScope(
  context: ReturnType<typeof buildAnalysisContext>,
  scopedModules: ItsmModuleKey[] | undefined,
  emailCount: number,
): string {
  const scope = scopedModules?.length ? scopedModules : CORE_ITSM_MODULE_KEYS;
  const lines: string[] = [
    `EVIDENCE: Analysis scope is limited to ${scope.map((key) => ITSM_MODULES[key].label).join(", ")}.`,
  ];

  for (const document of context.documents) {
    const matched = document.likelyModules.filter((key) => scope.includes(key));
    if (!matched.length) continue;
    lines.push(
      `EVIDENCE: ${document.name} — ${document.recordCount} detected record${document.recordCount === 1 ? "" : "s"}; in-scope classification: ${matched.map((key) => ITSM_MODULES[key].label).join(", ")}.`,
    );
  }

  if (emailCount > 0) {
    lines.push(`EVIDENCE: ${emailCount} stakeholder communication email${emailCount === 1 ? "" : "s"} supplied for communications review.`);
  }

  for (const key of scope) {
    if (!context.detectedModules.includes(key)) {
      lines.push(`UNKNOWN: No ${ITSM_MODULES[key].label} evidence was detected in the supplied packet.`);
    }
  }

  return lines.join("\n\n");
}

function ensureMimHandoverBlock(text: string): string {
  if (/\[MIM_HANDOVERS\]/i.test(text)) return text;
  const table = `<table style="width:100%;table-layout:fixed;"><thead><tr><th>Handover Date & Time</th><th>Outgoing MIM</th><th>Incoming MIM</th><th>Evidence / Source</th><th>Communication Sent By</th><th>Communication Subject / Type</th><th>Communication Date & Time</th><th>Notes</th></tr></thead><tbody><tr><td>Not evidenced</td><td>Not evidenced</td><td>Not evidenced</td><td>No explicit MIM handover/changeover was identified</td><td>Not evidenced</td><td>Not evidenced</td><td>Not evidenced</td><td>Human validation required</td></tr></tbody></table>`;
  return `${text.trim()}\n\n[MIM_HANDOVERS]\n${table}\n[/MIM_HANDOVERS]`;
}

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
            scopedModules,
            itsmContext: body.includeRaw ? context.rawContext : context.structuredContext,
            communications,
          }),
          temperature: providerConfig.temperature,
          maxTokens: providerConfig.maxTokens ?? 6_000,
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
          maxTokens: providerConfig.maxTokens ?? 6_000,
          documentCount: documents.length,
          estimatedTokens: Math.ceil((guidelineBundle.text.length + JSON.stringify(context).length) / 4),
        };

    // Call the selected provider
    const result = await callProvider(providerConfig, analysisRequest);

    // Enforce deterministic scope evidence and required MI handover structure.
    let reportText = result.text;
    if (analysisMode === "mi_comms") {
      reportText = replaceTaggedBlock(
        reportText,
        "EVIDENCE_SCOPE",
        deterministicEvidenceScope(context, scopedModules, communications?.emails.length ?? 0),
      );
      reportText = ensureMimHandoverBlock(reportText);
    }

    // Calculate cost estimate
    const costEstimate = result.usage
      ? estimateCost(result.provider, result.model, result.usage.promptTokens, result.usage.completionTokens)
      : undefined;

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      analysis: reportText,
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
