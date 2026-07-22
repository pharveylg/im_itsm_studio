/**
 * Multi-provider AI abstraction for ServiceNow analysis.
 * Supports: OpenAI, Anthropic Claude, Azure OpenAI, Ollama (local), and generic OpenAI-compatible endpoints.
 */

export type AiProviderKey = "openai" | "anthropic" | "azure-openai" | "ollama" | "generic";

export type AiProviderConfig = {
  key: AiProviderKey;
  name: string;
  description: string;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  // Provider-specific settings
  orgId?: string; // Anthropic
  deploymentName?: string; // Azure
  apiVersion?: string; // Azure
};

export type AnalysisRequest = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  // Context for cost/usage tracking
  documentCount: number;
  estimatedTokens: number;
};

export type AnalysisResponse = {
  text: string;
  provider: AiProviderKey;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  costEstimateUsd?: number;
};

export type ProviderHealth = {
  key: AiProviderKey;
  status: "healthy" | "degraded" | "unavailable" | "not_configured";
  latencyMs?: number;
  error?: string;
  lastChecked: Date;
};

// Default configurations for each provider
export const PROVIDER_DEFAULTS: Record<AiProviderKey, Partial<AiProviderConfig>> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-4o, GPT-3.5 via OpenAI API",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    maxTokens: 4000,
    temperature: 0.2,
  },
  anthropic: {
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Claude 3 Opus via Anthropic API",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 4000,
    temperature: 0.2,
  },
  "azure-openai": {
    name: "Azure OpenAI",
    description: "Microsoft Azure OpenAI Service - GPT-4, GPT-4o",
    endpoint: "https://{your-resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions",
    model: "gpt-4o",
    apiVersion: "2024-08-01-preview",
    maxTokens: 4000,
    temperature: 0.2,
  },
  ollama: {
    name: "Ollama (Local)",
    description: "Local models via Ollama - Llama 3, Mistral, Mixtral",
    endpoint: "http://localhost:11434/api/generate",
    model: "llama3.2",
    maxTokens: 4000,
    temperature: 0.2,
  },
  generic: {
    name: "Generic OpenAI-Compatible",
    description: "Any OpenAI-compatible endpoint - Groq, Together, local inference servers",
    endpoint: "http://localhost:8000/v1/chat/completions",
    model: "default",
    maxTokens: 4000,
    temperature: 0.2,
  },
};

// Cost per 1K tokens (approximate, prompt/completion)
export const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
  "openai:gpt-4o": { input: 0.0025, output: 0.01 },
  "openai:gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "openai:gpt-4": { input: 0.03, output: 0.06 },
  "openai:gpt-4-turbo": { input: 0.01, output: 0.03 },
  "anthropic:claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "anthropic:claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  "anthropic:claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
  "azure-openai:gpt-4o": { input: 0.005, output: 0.015 }, // Azure pricing varies
  "ollama:default": { input: 0, output: 0 }, // Free (local)
};

export function estimateCost(provider: AiProviderKey, model: string, inputTokens: number, outputTokens: number): number {
  const key = `${provider}:${model}`;
  const costs = PROVIDER_COSTS[key] || PROVIDER_COSTS[`${provider}:default`] || { input: 0.01, output: 0.03 };
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

export function getProviderDisplayName(config: AiProviderConfig): string {
  return config.name || PROVIDER_DEFAULTS[config.key].name || config.key;
}

export function validateProviderConfig(config: AiProviderConfig): string[] {
  const errors: string[] = [];
  
  switch (config.key) {
    case "openai":
      if (!config.apiKey) errors.push("OpenAI API key required");
      break;
    case "anthropic":
      if (!config.apiKey) errors.push("Anthropic API key required");
      break;
    case "azure-openai":
      if (!config.apiKey) errors.push("Azure API key required");
      if (!config.endpoint || config.endpoint.includes("{your-resource}")) {
        errors.push("Azure endpoint required (replace {your-resource} and {deployment})");
      }
      break;
    case "ollama":
      // Ollama doesn't require API key for local
      if (!config.endpoint) errors.push("Ollama endpoint required (default: http://localhost:11434)");
      break;
    case "generic":
      if (!config.endpoint) errors.push("Endpoint URL required");
      break;
  }
  
  return errors;
}

// Helper to check if a provider is likely M365 Copilot
export function isMicrosoftCopilotProvider(config: AiProviderConfig): boolean {
  return config.key === "azure-openai" || 
    (config.endpoint?.includes("microsoft") || config.endpoint?.includes("azure")) ||
    config.model.toLowerCase().includes("copilot");
}
