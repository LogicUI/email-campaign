"use client";

import { useCallback, useState } from "react";

import { useAiSettings } from "@/hooks/use-ai-settings";
import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectRecipientById } from "@/store/selectors";
import type { RegenerateResponse, RegenerateStreamEvent } from "@/types/api";

type RegenerateStartResult = "started" | "blocked";

function parseSseBlock(block: string): RegenerateStreamEvent | null {
  const lines = block.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (!eventLine || dataLines.length === 0) {
    return null;
  }

  const eventType = eventLine.slice(6).trim();
  const payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;

  switch (eventType) {
    case "start":
      return {
        type: "start",
        recipientId: String(payload.recipientId ?? ""),
      };
    case "body_delta":
      return {
        type: "body_delta",
        recipientId: String(payload.recipientId ?? ""),
        chunk: String(payload.chunk ?? ""),
      };
    case "final":
      return {
        type: "final",
        recipientId: String(payload.recipientId ?? ""),
        body: String(payload.body ?? ""),
        subject:
          typeof payload.subject === "string" ? payload.subject : undefined,
        reasoning:
          typeof payload.reasoning === "string" ? payload.reasoning : undefined,
      };
    case "error":
      return {
        type: "error",
        recipientId: String(payload.recipientId ?? ""),
        error: String(payload.error ?? "AI regenerate failed."),
      };
    default:
      return null;
  }
}

export function useRecipientRegenerate(recipientId: string) {
  const campaign = useCampaignStore(selectCampaign);
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const startRecipientRegeneration = useCampaignStore(
    (state) => state.startRecipientRegeneration,
  );
  const appendGeneratedBodyChunk = useCampaignStore(
    (state) => state.appendGeneratedBodyChunk,
  );
  const failRecipientRegeneration = useCampaignStore(
    (state) => state.failRecipientRegeneration,
  );
  const applyGeneratedBody = useCampaignStore((state) => state.applyGeneratedBody);
  const { resolvedActiveProvider } = useAiSettings();
  const [error, setError] = useState<string | null>(null);

  const consumeRegenerateStream = useCallback(async (
    responseBody: ReadableStream<Uint8Array<ArrayBufferLike>>,
  ) => {
    try {
      const reader = responseBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode();
        } else {
          buffer += decoder.decode(value, { stream: true });
        }

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const event = parseSseBlock(block);

          if (!event) {
            continue;
          }

          switch (event.type) {
            case "start":
              break;
            case "body_delta":
              appendGeneratedBodyChunk(event.recipientId, event.chunk);
              break;
            case "final":
              completed = true;
              applyGeneratedBody({
                id: event.recipientId,
                body: event.body,
                subject: event.subject,
                reasoning: event.reasoning,
              });
              break;
            case "error":
              throw new Error(event.error);
          }
        }

        if (done) {
          break;
        }
      }

      if (!completed) {
        throw new Error("AI regenerate stream ended before completion.");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";

      if (useCampaignStore.getState().recipientsById[recipientId]?.isRegenerating) {
        failRecipientRegeneration({
          id: recipientId,
          errorMessage: message,
        });
      }

      setError(message);
    }
  }, [appendGeneratedBodyChunk, applyGeneratedBody, failRecipientRegeneration, recipientId]);

  const regenerate = useCallback(async (prompt: string): Promise<RegenerateStartResult> => {
    if (!campaign || !recipient) {
      return "blocked";
    }

    if (!resolvedActiveProvider.isConfigured) {
      setError("Configure an AI provider in AI Settings before regenerating drafts.");
      return "blocked";
    }

    if (
      recipient.manualEditsSinceGenerate &&
      recipient.lastGeneratedBody &&
      !window.confirm("Replace the current manual draft with a new AI draft?")
    ) {
      return "blocked";
    }

    setError(null);

    try {
      // This endpoint intentionally stays on fetch because the browser flow
      // consumes `response.body` directly as an SSE stream.
      const response = await fetch("/api/ai/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          globalSubject: campaign.globalSubject,
          globalBodyTemplate: campaign.globalBodyTemplate,
          currentBody: recipient.body,
          prompt,
          provider: resolvedActiveProvider.provider,
          apiKey: resolvedActiveProvider.apiKey,
          model: resolvedActiveProvider.model,
          recipient: {
            email: recipient.email,
            fields: recipient.fields,
          },
          mode: "refresh",
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as RegenerateResponse;
        throw new Error(data.error ?? "AI regenerate failed.");
      }

      if (!response.body) {
        throw new Error("AI regenerate stream did not return a readable body.");
      }

      startRecipientRegeneration(recipientId);
      void consumeRegenerateStream(response.body);

      return "started";
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";
      setError(message);
      return "blocked";
    }
  }, [
    campaign,
    consumeRegenerateStream,
    recipient,
    recipientId,
    resolvedActiveProvider.apiKey,
    resolvedActiveProvider.isConfigured,
    resolvedActiveProvider.model,
    resolvedActiveProvider.provider,
    startRecipientRegeneration,
  ]);

  return {
    regenerate,
    isRegenerating: recipient?.isRegenerating ?? false,
    error,
  };
}
