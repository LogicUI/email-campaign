import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AiSettingsDialog } from "@/components/settings/ai-settings-dialog";

vi.mock("@/hooks/use-ai-settings", () => ({
  useAiSettings: vi.fn(),
}));

const { useAiSettings } = await import("@/hooks/use-ai-settings");

describe("AiSettingsDialog", () => {
  it("activates the selected provider on save when the previous active provider is not configured", async () => {
    const user = userEvent.setup();
    const setActiveProvider = vi.fn();
    const setProviderApiKey = vi.fn();
    const setProviderCustomModel = vi.fn();

    vi.mocked(useAiSettings).mockReturnValue({
      activeModel: "gpt-4o-mini",
      activeProvider: "openai",
      activeProviderLabel: "OpenAI",
      clearProviderSettings: vi.fn(),
      configuredProviders: [],
      providerCards: [],
      providers: {
        openai: { apiKey: "", customModel: "" },
        deepseek: { apiKey: "", customModel: "" },
        anthropic: { apiKey: "", customModel: "" },
        google: { apiKey: "", customModel: "" },
      },
      resolvedActiveProvider: {
        provider: "openai",
        apiKey: "",
        model: "gpt-4o-mini",
        isConfigured: false,
      },
      setActiveProvider,
      setProviderApiKey,
      setProviderCustomModel,
    } as never);

    render(<AiSettingsDialog open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /DeepSeek/i }));
    await user.type(screen.getByLabelText("API key"), "sk-deepseek");
    await user.click(screen.getByRole("button", { name: "Save AI settings" }));

    expect(setProviderApiKey).toHaveBeenCalledWith("deepseek", "sk-deepseek");
    expect(setActiveProvider).toHaveBeenCalledWith("deepseek");
  });
});
