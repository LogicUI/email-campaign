"use client";

import { useMemo } from "react";

import {
  AI_PROVIDER_CATALOG,
  LLM_PROVIDERS,
  maskApiKey,
  resolveProviderConfig,
} from "@/core/ai/provider-defaults";
import { useAiSettingsStore } from "@/store/ai-settings-store";

export function useAiSettings() {
  const activeProvider = useAiSettingsStore((state) => state.activeProvider);
  const providers = useAiSettingsStore((state) => state.providers);
  const setActiveProvider = useAiSettingsStore((state) => state.setActiveProvider);
  const setProviderApiKey = useAiSettingsStore((state) => state.setProviderApiKey);
  const setProviderCustomModel = useAiSettingsStore(
    (state) => state.setProviderCustomModel,
  );
  const clearProviderSettings = useAiSettingsStore(
    (state) => state.clearProviderSettings,
  );

  const resolvedActiveProvider = useMemo(
    () => resolveProviderConfig(activeProvider, providers[activeProvider]),
    [activeProvider, providers],
  );

  const configuredProviders = useMemo(
    () =>
      Object.entries(providers)
        .filter(([, settings]) => Boolean(settings.apiKey.trim()))
        .map(([provider]) => provider),
    [providers],
  );

  const providerCards = useMemo(
    () =>
      LLM_PROVIDERS.map((provider) => ({
        ...AI_PROVIDER_CATALOG[provider],
        provider,
        maskedApiKey: maskApiKey(providers[provider].apiKey),
        isActive: activeProvider === provider,
        isConfigured: Boolean(providers[provider].apiKey.trim()),
        resolvedModel: resolveProviderConfig(provider, providers[provider]).model,
      })),
    [activeProvider, providers],
  );

  return {
    activeModel: resolvedActiveProvider.model,
    activeProvider,
    activeProviderLabel: AI_PROVIDER_CATALOG[activeProvider].label,
    clearProviderSettings,
    configuredProviders,
    providerCards,
    providers,
    resolvedActiveProvider,
    setActiveProvider,
    setProviderApiKey,
    setProviderCustomModel,
  };
}
