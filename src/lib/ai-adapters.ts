/**
 * Provider-specific API adapters for AI analysis.
 * Each adapter handles the unique request/response format of its provider.
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

// Base fetch with timeout
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
  
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
    temperature: request.temperature ?? config.temperature ?? 0.2,
    max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.orgId ? { "OpenAI-Organization": config.orgId } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message?: { content: string }; text?: string }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  const text = data.choices[0]?.message?.content || data.choices[0]?.text || "";
  
  return {
    text,
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
  
  const body = {
    model: config.model,
    max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
    temperature: request.temperature ?? config.temperature ?? 0.2,
    system: request.systemPrompt,
    messages: [{ role: "user", content: request.userPrompt }],
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error (${response.status}): ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
    model: string;
  };

  const text = data.content.find((c) => c.type === "text")?.text || "";

  return {
    text,
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
  
  // Azure endpoint format: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version={version}
  let endpoint = config.endpoint!;
  const apiVersion = config.apiVersion || "2024-08-01-preview";
  
  if (!endpoint.includes("api-version")) {
    endpoint += endpoint.includes("?") ? "&" : "?";
    endpoint += `api-version=${apiVersion}`;
  }

  const body = {
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
    temperature: request.temperature ?? config.temperature ?? 0.2,
    max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey!,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI error (${response.status}): ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message?: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  const text = data.choices[0]?.message?.content || "";

  return {
    text,
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

// ============ Ollama Adapter ============
async function callOllama(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const endpoint = config.endpoint || PROVIDER_DEFAULTS.ollama.endpoint!;
  
  // Ollama uses a simpler format
  const body = {
    model: config.model,
    prompt: `${request.systemPrompt}\n\n${request.userPrompt}`,
    stream: false,
    options: {
      temperature: request.temperature ?? config.temperature ?? 0.2,
      num_predict: request.maxTokens ?? config.maxTokens ?? 4000,
    },
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error (${response.status}): ${error.slice(0, 500)}`);
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

// ============ Generic OpenAI-Compatible Adapter ============
async function callGeneric(
  config: AiProviderConfig,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
    temperature: request.temperature ?? config.temperature ?? 0.2,
    max_tokens: request.maxTokens ?? config.maxTokens ?? 4000,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetchWithTimeout(config.endpoint!, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content: string }; text?: string }>;
    text?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model?: string;
  };

  const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.text || "";

  return {
    text,
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

// Health check for a provider
export async function checkProviderHealth(config: AiProviderConfig): Promise<{
  status: "healthy" | "degraded" | "unavailable";
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Send a minimal test prompt
    const testRequest: AnalysisRequest = {
      systemPrompt: "You are a test system. Respond with only the word 'OK'.",
      userPrompt: "Test",
      documentCount: 1,
      estimatedTokens: 50,
    };

    const response = await callProvider(config, testRequest);
    const latencyMs = Date.now() - startTime;

    if (response.text.toLowerCase().includes("ok")) {
      return { status: "healthy", latencyMs };
    }
    
    return { status: "degraded", latencyMs };
  } catch (error) {
    return {
      status: "unavailable",
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
