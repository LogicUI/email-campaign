"use client";

import { useCallback, useState } from "react";

import { useAiSettings } from "@/hooks/use-ai-settings";
import type {
  GlobalTemplateRegenerateRequest,
  GlobalTemplateRegenerateResponse,
} from "@/types/api";

type RegenerateStartResult = "started" | "blocked";

export function useGlobalTemplateRegenerate() {
  const { resolvedActiveProvider } = useAiSettings();
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerate = useCallback(
    (
      payload: Omit<GlobalTemplateRegenerateRequest, "provider" | "apiKey" | "model">,
      onSuccess?: (
        data: NonNullable<GlobalTemplateRegenerateResponse["data"]>,
      ) => void,
    ): RegenerateStartResult => {
      if (!resolvedActiveProvider.isConfigured) {
        setError("Configure an AI provider in AI Settings before regenerating drafts.");
        return "blocked";
      }

      setError(null);
      setIsRegenerating(true);

      void (async () => {
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

          onSuccess?.(data.data);
        } catch (caughtError) {
          const message =
            caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";
          setError(message);
        } finally {
          setIsRegenerating(false);
        }
      })();

      return "started";
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
