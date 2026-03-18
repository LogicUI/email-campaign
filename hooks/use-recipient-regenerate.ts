"use client";

import { useCallback, useState } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectRecipientById } from "@/store/selectors";
import type { RegenerateResponse } from "@/types/api";

export function useRecipientRegenerate(recipientId: string) {
  const campaign = useCampaignStore(selectCampaign);
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const setRecipientRegenerating = useCampaignStore(
    (state) => state.setRecipientRegenerating,
  );
  const applyGeneratedBody = useCampaignStore((state) => state.applyGeneratedBody);
  const [error, setError] = useState<string | null>(null);

  const regenerate = useCallback(async () => {
    if (!campaign || !recipient) {
      return;
    }

    if (
      recipient.manualEditsSinceGenerate &&
      recipient.lastGeneratedBody &&
      !window.confirm("Replace the current manual draft with a new AI draft?")
    ) {
      return;
    }

    setError(null);
    setRecipientRegenerating(recipientId, true);

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
        id: recipientId,
        body: data.data.body,
        subject: data.data.subject,
      });
    } catch (caughtError) {
      setRecipientRegenerating(recipientId, false);
      setError(
        caughtError instanceof Error ? caughtError.message : "AI regenerate failed.",
      );
    }
  }, [applyGeneratedBody, campaign, recipient, recipientId, setRecipientRegenerating]);

  return {
    regenerate,
    isRegenerating: recipient?.isRegenerating ?? false,
    error,
  };
}
