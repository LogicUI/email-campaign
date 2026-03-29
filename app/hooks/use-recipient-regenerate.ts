"use client";

import { useCallback, useState } from "react";

import { useAiSettings } from "@/hooks/use-ai-settings";
import { formatRegeneratedEmailBody } from "@/core/email/format-regenerated-email-body";
import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectRecipientById } from "@/store/selectors";
import type { RegenerateResponse } from "@/types/api";

type RegenerateStartResult = "started" | "blocked";

export function useRecipientRegenerate(recipientId: string) {
  const campaign = useCampaignStore(selectCampaign);
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const startRecipientRegeneration = useCampaignStore(
    (state) => state.startRecipientRegeneration,
  );
  const failRecipientRegeneration = useCampaignStore(
    (state) => state.failRecipientRegeneration,
  );
  const applyGeneratedBody = useCampaignStore((state) => state.applyGeneratedBody);
  const { resolvedActiveProvider } = useAiSettings();
  const [error, setError] = useState<string | null>(null);

  const regenerate = useCallback((prompt: string): RegenerateStartResult => {
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
    startRecipientRegeneration(recipientId);

    void (async () => {
      try {
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

        const data = (await response.json()) as RegenerateResponse;

        if (!response.ok || !data.ok || !data.data) {
          throw new Error(data.error ?? "AI regenerate failed.");
        }

        applyGeneratedBody({
          id: data.data.recipientId,
          body: formatRegeneratedEmailBody(data.data.body, recipient.attachments ?? []),
          subject: data.data.subject,
          reasoning: data.data.reasoning,
        });
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
    })();

    return "started";
  }, [
    campaign,
    recipient,
    recipientId,
    applyGeneratedBody,
    failRecipientRegeneration,
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
