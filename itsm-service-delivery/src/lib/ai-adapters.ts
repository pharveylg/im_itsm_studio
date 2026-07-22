/**
 * Provider-specific API adapters for AI analysis.
 * Supports: OpenAI, Anthropic Claude, Azure OpenAI, Ollama (local), and generic OpenAI-compatible endpoints.
 *
 * Local providers (ollama, generic) only work when the app runs on your own machine
 * (`npm run dev` or `npm start`). On Vercel/Supabase deployments, localhost
 * endpoints are unreachable.
 */

import {
  type AiProviderConfig,
  type AiProviderKey,
  type AnalysisRequest,
  type AnalysisResponse,
  PROVIDER_DEFAULTS,
  PROVIDER_COSTS,
} from "./ai-providers";

const DEFAULT_TIMEOUT = 120_000;
const HEALTH_TIMEOUT = 12_000;

export function estimateCost(
  provider: AiProviderKey,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const key = `${provider}:${model}`;
  const costs = PROVIDER_COSTS[key] || PROVIDER_COSTS[`${provider}:default`] || { input: 0.01, output: 0.03 };
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeout / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ============ OpenAI Adapter ============
async function callOpenAI(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const endpoint = config.endpoint || PROVIDER_DEFAULTS.openai.endpoint!;

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.orgId ? { "OpenAI-Organization": config.orgId } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature ?? config.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI ${response.status}: ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message?: { content: string }; text?: string }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  return {
    text: data.choices[0]?.message?.content || data.choices[0]?.text || "",
    provider: "openai",
    model: data.model || config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
    latencyMs: Date.now() - startTime,
  };
}

// ============ Anthropic Claude Adapter ============
async function callAnthropic(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const endpoint = config.endpoint || PROVIDER_DEFAULTS.anthropic.endpoint!;

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
      temperature: request.temperature ?? config.temperature ?? 0.2,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic ${response.status}: ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
    model: string;
  };

  return {
    text: data.content.find((c) => c.type === "text")?.text || "",
    provider: "anthropic",
    model: data.model || config.model,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    } : undefined,
    latencyMs: Date.now() - startTime,
  };
}

// ============ Azure OpenAI Adapter ============
async function callAzureOpenAI(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  let endpoint = config.endpoint!;
  const apiVersion = config.apiVersion || "2024-08-01-preview";

  if (!endpoint.includes("api-version")) {
    endpoint += endpoint.includes("?") ? "&" : "?";
    endpoint += `api-version=${apiVersion}`;
  }

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey!,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature ?? config.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI ${response.status}: ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message?: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  return {
    text: data.choices[0]?.message?.content || "",
    provider: "azure-openai",
    model: data.model || config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
    latencyMs: Date.now() - startTime,
  };
}

// ============ Ollama Adapter (LOCAL ONLY) ============
async function callOllama(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const endpoint = config.endpoint || PROVIDER_DEFAULTS.ollama.endpoint!;

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt: `${request.systemPrompt}\n\n${request.userPrompt}`,
      stream: false,
      options: {
        temperature: request.temperature ?? config.temperature ?? 0.2,
        num_predict: request.maxTokens ?? config.maxTokens ?? 4000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama ${response.status}: ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    response: string;
    eval_count?: number;
    prompt_eval_count?: number;
  };

  return {
    text: data.response,
    provider: "ollama",
    model: config.model,
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
    latencyMs: Date.now() - startTime,
  };
}

// ============ Generic OpenAI-Compatible Adapter (LOCAL OR CLOUD) ============
async function callGeneric(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();

  const response = await fetchWithTimeout(config.endpoint!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature ?? config.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API ${response.status}: ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content: string }; text?: string }>;
    text?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model?: string;
  };

  return {
    text: data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.text || "",
    provider: "generic",
    model: data.model || config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
    latencyMs: Date.now() - startTime,
  };
}

// ============ Provider Router ============
export async function callProvider(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  switch (config.key) {
    case "openai":
      return callOpenAI(config, request);
    case "anthropic":
      return callAnthropic(config, request);
    case "azure-openai":
      return callAzureOpenAI(config, request);
    case "ollama":
      return callOllama(config, request);
    case "generic":
      return callGeneric(config, request);
    default:
      throw new Error(`Unknown provider: ${config.key}`);
  }
}

/**
 * Lightweight health check — validates credentials with a minimal request.
 */
export async function checkProviderHealth(config: AiProviderConfig): Promise<{
  status: "healthy" | "degraded" | "unavailable" | "not_configured";
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  if (!config.enabled) {
    return { status: "not_configured", latencyMs: 0 };
  }

  try {
    switch (config.key) {
      case "ollama": {
        // Local Ollama: just check if the server is reachable
        const baseUrl = (config.endpoint || PROVIDER_DEFAULTS.ollama.endpoint!)
          .replace(/\/api\/generate.*$/, "")
          .replace(/\/api\/chat.*$/, "");
        const response = await fetchWithTimeout(`${baseUrl}/api/tags`, {
          method: "GET",
        }, HEALTH_TIMEOUT);
        if (response.ok) {
          return { status: "healthy", latencyMs: Date.now() - startTime };
        }
        throw new Error(`Ollama not reachable (${response.status})`);
      }

      case "anthropic": {
        if (!config.apiKey) throw new Error("API key not configured");
        const endpoint = config.endpoint || PROVIDER_DEFAULTS.anthropic.endpoint!;
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 5,
            messages: [{ role: "user", content: "Say OK" }],
          }),
        }, HEALTH_TIMEOUT);
        if (response.ok) {
          return { status: "healthy", latencyMs: Date.now() - startTime };
        }
        const errorText = await response.text();
        let detail = "";
        try {
          const parsed = JSON.parse(errorText) as { error?: { message?: string; type?: string } };
          detail = parsed.error?.message || parsed.error?.type || "";
        } catch {
          detail = errorText.slice(0, 200);
        }
        throw new Error(`Anthropic ${response.status}${detail ? `: ${detail}` : ""}`);
      }

      case "azure-openai": {
        if (!config.apiKey) throw new Error("API key not configured");
        if (!config.endpoint || config.endpoint.includes("{your-resource}")) {
          throw new Error("Endpoint not configured — set your Azure resource URL and deployment name");
        }
        let endpoint = config.endpoint;
        const apiVersion = config.apiVersion || "2024-08-01-preview";
        if (!endpoint.includes("api-version")) {
          endpoint += endpoint.includes("?") ? "&" : "?";
          endpoint += `api-version=${apiVersion}`;
        }
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": config.apiKey,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Say OK" }],
            max_tokens: 5,
          }),
        }, HEALTH_TIMEOUT);
        if (response.ok) {
          return { status: "healthy", latencyMs: Date.now() - startTime };
        }
        const azureError = await response.text().catch(() => "");
        throw new Error(`Azure ${response.status}: ${azureError.slice(0, 200)}`);
      }

      case "openai": {
        if (!config.apiKey) throw new Error("API key not configured");
        const endpoint = config.endpoint || PROVIDER_DEFAULTS.openai.endpoint!;
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: "Say OK" }],
            max_tokens: 5,
          }),
        }, HEALTH_TIMEOUT);
        if (response.ok) {
          return { status: "healthy", latencyMs: Date.now() - startTime };
        }
        const openaiError = await response.text().catch(() => "");
        let openaiDetail = "";
        try {
          const parsed = JSON.parse(openaiError) as { error?: { message?: string } };
          openaiDetail = parsed.error?.message || "";
        } catch {
          openaiDetail = openaiError.slice(0, 200);
        }
        throw new Error(`OpenAI ${response.status}${openaiDetail ? `: ${openaiDetail}` : ""}`);
      }

      case "generic": {
        if (!config.endpoint) throw new Error("Endpoint not configured");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
        const response = await fetchWithTimeout(config.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: "Say OK" }],
            max_tokens: 5,
          }),
        }, HEALTH_TIMEOUT);
        if (response.ok) {
          return { status: "healthy", latencyMs: Date.now() - startTime };
        }
        throw new Error(`Endpoint ${response.status}`);
      }

      default:
        throw new Error("Unknown provider");
    }
  } catch (error) {
    return {
      status: "unavailable",
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
