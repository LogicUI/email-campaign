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

/**
 * Creates the empty settings object used for a single AI provider.
 *
 * @returns Blank provider settings ready for local state initialization.
 */
function createEmptyProviderSettings(): LlmProviderSettings {
  return {
    apiKey: "",
    customModel: "",
  };
}

/**
 * Builds the initial browser-local AI settings state for all supported providers.
 *
 * @returns Default provider settings record keyed by provider id.
 */
export function createInitialAiProvidersState() {
  return {
    openai: createEmptyProviderSettings(),
    deepseek: createEmptyProviderSettings(),
    anthropic: createEmptyProviderSettings(),
    google: createEmptyProviderSettings(),
  } satisfies Record<LlmProvider, LlmProviderSettings>;
}

/**
 * Resolves the model that should actually be used for a provider request.
 *
 * Custom user-entered models take precedence; otherwise the provider catalog default
 * is used.
 *
 * @param provider Provider being configured.
 * @param settings Stored provider settings for that provider.
 * @returns Final model id to use in API calls.
 */
function resolveProviderModel(
  provider: LlmProvider,
  settings: LlmProviderSettings,
) {
  return settings.customModel.trim() || AI_PROVIDER_CATALOG[provider].defaultModel;
}

/**
 * Resolves the UI settings for a provider into a request-ready config object.
 *
 * @param provider Provider being configured.
 * @param settings Stored provider settings for that provider.
 * @returns Request-ready provider config including resolved model and configured flag.
 */
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

/**
 * Masks an API key for UI display without revealing the full secret.
 *
 * @param apiKey Raw stored API key.
 * @returns Human-readable masked key label.
 */
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
