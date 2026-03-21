"use client";

import { useCallback, useState } from "react";

import { useAiSettings } from "@/hooks/use-ai-settings";
import type {
  GlobalTemplateRegenerateRequest,
  GlobalTemplateRegenerateResponse,
} from "@/types/api";

export function useGlobalTemplateRegenerate() {
  const { resolvedActiveProvider } = useAiSettings();
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerate = useCallback(
    async (
      payload: Omit<GlobalTemplateRegenerateRequest, "provider" | "apiKey" | "model">,
    ) => {
      if (!resolvedActiveProvider.isConfigured) {
        setError("Configure an AI provider in AI Settings before regenerating drafts.");
        return null;
      }

      setError(null);
      setIsRegenerating(true);

      try {
        const response = await fetch("/api/ai/regenerate-global-template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            provider: resolvedActiveProvider.provider,
            apiKey: resolvedActiveProvider.apiKey,
            model: resolvedActiveProvider.model,
          } satisfies GlobalTemplateRegenerateRequest),
        });

        const data = (await response.json()) as GlobalTemplateRegenerateResponse;

        if (!response.ok || !data.ok || !data.data) {
          throw new Error(data.error ?? "AI regenerate failed.");
        }

        return data.data;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";
        setError(message);
        return null;
      } finally {
        setIsRegenerating(false);
      }
    },
    [
      resolvedActiveProvider.apiKey,
      resolvedActiveProvider.isConfigured,
      resolvedActiveProvider.model,
      resolvedActiveProvider.provider,
    ],
  );

  return {
    regenerate,
    isRegenerating,
    error,
  };
}
