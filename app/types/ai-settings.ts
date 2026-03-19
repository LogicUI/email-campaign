export type LlmProvider = "anthropic" | "deepseek" | "google" | "openai";

export interface LlmProviderSettings {
  apiKey: string;
  customModel: string;
}

export interface AiSettingsState {
  activeProvider: LlmProvider;
  providers: Record<LlmProvider, LlmProviderSettings>;
}

export interface AiSettingsStore extends AiSettingsState {
  clearProviderSettings: (provider: LlmProvider) => void;
  setActiveProvider: (provider: LlmProvider) => void;
  setProviderApiKey: (provider: LlmProvider, apiKey: string) => void;
  setProviderCustomModel: (provider: LlmProvider, customModel: string) => void;
}

export interface ResolvedAiProviderConfig {
  apiKey: string;
  isConfigured: boolean;
  model: string;
  provider: LlmProvider;
}

export interface ProviderCatalogEntry {
  apiKeyPlaceholder: string;
  defaultModel: string;
  description: string;
  label: string;
}

export interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface AiSettingsTriggerProps {
  context: "header" | "upload";
}
