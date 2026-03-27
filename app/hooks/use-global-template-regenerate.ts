"use client";

import { useCallback, useState } from "react";

import { useAiSettings } from "@/hooks/use-ai-settings";
import type { GlobalTemplateRegenerateRequest } from "@/types/api";

export function useGlobalTemplateRegenerate() {
  const { resolvedActiveProvider } = useAiSettings();
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerate = useCallback(
    async (
      payload: Omit<GlobalTemplateRegenerateRequest, "provider" | "apiKey" | "model">,
      onStreamDelta?: (chunk: string) => void,
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

        if (!response.ok) {
          throw new Error("AI regenerate failed.");
        }

        // Handle SSE streaming
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body.");
        }

        const decoder = new TextDecoder();
        let finalBody = null;
        let accumulatedBody = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "body_delta") {
                  accumulatedBody += data.chunk;
                  onStreamDelta?.(accumulatedBody);
                } else if (data.type === "done") {
                  finalBody = data.data.body;
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch {
                // Ignore non-JSON lines
              }
            }
          }
        }

        if (!finalBody) {
          throw new Error("No data received from AI.");
        }

        return finalBody;
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
