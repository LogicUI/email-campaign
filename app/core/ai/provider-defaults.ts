import type {
  LlmProvider,
  LlmProviderSettings,
  ProviderCatalogEntry,
  ResolvedAiProviderConfig,
} from "@/types/ai-settings";

export const LLM_PROVIDERS: LlmProvider[] = [
  "openai",
  "deepseek",
  "anthropic",
  "google",
];

export const AI_PROVIDER_CATALOG: Record<LlmProvider, ProviderCatalogEntry> = {
  openai: {
    label: "OpenAI",
    description: "Reliable JSON draft rewrites with GPT-family models.",
    defaultModel: "gpt-4o-mini",
    apiKeyPlaceholder: "sk-...",
  },
  deepseek: {
    label: "DeepSeek",
    description: "OpenAI-compatible endpoint with cost-efficient chat models.",
    defaultModel: "deepseek-chat",
    apiKeyPlaceholder: "sk-...",
  },
  anthropic: {
    label: "Anthropic",
    description: "Claude models for long-form, high-quality email rewrites.",
    defaultModel: "claude-3-5-sonnet-latest",
    apiKeyPlaceholder: "sk-ant-...",
  },
  google: {
    label: "Google",
    description: "Gemini models via Google AI Studio API keys.",
    defaultModel: "gemini-2.0-flash",
    apiKeyPlaceholder: "AIza...",
  },
};

export function createEmptyProviderSettings(): LlmProviderSettings {
  return {
    apiKey: "",
    customModel: "",
  };
}

export function createInitialAiProvidersState() {
  return {
    openai: createEmptyProviderSettings(),
    deepseek: createEmptyProviderSettings(),
    anthropic: createEmptyProviderSettings(),
    google: createEmptyProviderSettings(),
  } satisfies Record<LlmProvider, LlmProviderSettings>;
}

export function resolveProviderModel(
  provider: LlmProvider,
  settings: LlmProviderSettings,
) {
  return settings.customModel.trim() || AI_PROVIDER_CATALOG[provider].defaultModel;
}

export function resolveProviderConfig(
  provider: LlmProvider,
  settings: LlmProviderSettings,
): ResolvedAiProviderConfig {
  return {
    provider,
    apiKey: settings.apiKey.trim(),
    model: resolveProviderModel(provider, settings),
    isConfigured: Boolean(settings.apiKey.trim()),
  };
}

export function maskApiKey(apiKey: string) {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return "Not configured";
  }

  if (trimmed.length <= 8) {
    return "Saved locally";
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
