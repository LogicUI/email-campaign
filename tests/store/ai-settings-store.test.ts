import { describe, expect, it } from "vitest";

import {
  AI_PROVIDER_CATALOG,
  resolveProviderConfig,
} from "@/core/ai/provider-defaults";
import {
  initialAiSettingsState,
  useAiSettingsStore,
} from "@/store/ai-settings-store";

describe("useAiSettingsStore", () => {
  it("stores multiple provider keys and switches the active provider", () => {
    useAiSettingsStore.setState(initialAiSettingsState);

    const store = useAiSettingsStore.getState();
    store.setProviderApiKey("openai", "sk-openai");
    store.setProviderApiKey("anthropic", "sk-anthropic");
    store.setActiveProvider("anthropic");

    const next = useAiSettingsStore.getState();
    expect(next.providers.openai.apiKey).toBe("sk-openai");
    expect(next.providers.anthropic.apiKey).toBe("sk-anthropic");
    expect(next.activeProvider).toBe("anthropic");
  });

  it("resolves defaults and custom model overrides", () => {
    useAiSettingsStore.setState(initialAiSettingsState);

    const store = useAiSettingsStore.getState();
    store.setProviderApiKey("google", "AIza-test");

    expect(
      resolveProviderConfig("google", useAiSettingsStore.getState().providers.google),
    ).toMatchObject({
      apiKey: "AIza-test",
      isConfigured: true,
      model: AI_PROVIDER_CATALOG.google.defaultModel,
      provider: "google",
    });

    store.setProviderCustomModel("google", "gemini-1.5-pro");

    expect(
      resolveProviderConfig("google", useAiSettingsStore.getState().providers.google).model,
    ).toBe("gemini-1.5-pro");
  });
});
