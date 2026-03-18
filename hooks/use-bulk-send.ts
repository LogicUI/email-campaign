"use client";

import { useCallback, useMemo, useState } from "react";

import { validateRecipient } from "@/lib/campaign/validate-recipient";
import { createId } from "@/lib/utils/ids";
import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectRecipientOrder, selectUi } from "@/store/selectors";
import type { BulkSendResponse, SendPayloadRecipient } from "@/types/api";

export function useBulkSend() {
  const campaign = useCampaignStore(selectCampaign);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
  const recipientsById = useCampaignStore((state) => state.recipientsById);
  const ui = useCampaignStore(selectUi);
  const markRecipientsQueued = useCampaignStore((state) => state.markRecipientsQueued);
  const markRecipientsSending = useCampaignStore((state) => state.markRecipientsSending);
  const applySendResults = useCampaignStore((state) => state.applySendResults);
  const toggleRecipientsChecked = useCampaignStore((state) => state.toggleRecipientsChecked);
  const setSending = useCampaignStore((state) => state.setSending);
  const [error, setError] = useState<string | null>(null);

  const checkedUnsentIds = useMemo(
    () =>
      recipientOrder.filter((id) => {
        const recipient = recipientsById[id];
        return recipient?.checked && !recipient.sent && recipient.status !== "sending";
      }),
    [recipientOrder, recipientsById],
  );

  const failedIds = useMemo(
    () =>
      recipientOrder.filter((id) => recipientsById[id]?.status === "failed"),
    [recipientOrder, recipientsById],
  );

  const sendSelected = useCallback(async () => {
    if (!campaign) {
      return;
    }

    const eligibleIds = checkedUnsentIds.filter((id) => {
      const recipient = recipientsById[id];
      return Boolean(recipient) && !validateRecipient(recipient.email, recipient.subject, recipient.body);
    });

    if (eligibleIds.length === 0) {
      setError("No valid checked recipients are ready to send.");
      return;
    }

    const payloadRecipients: SendPayloadRecipient[] = eligibleIds.map((id) => {
      const recipient = recipientsById[id];
      return {
        id: recipient.id,
        email: recipient.email,
        subject: recipient.subject,
        body: recipient.body,
      };
    });

    setError(null);
    setSending(true);
    markRecipientsQueued(eligibleIds);
    markRecipientsSending(eligibleIds);

    try {
      const response = await fetch("/api/send/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          sendJobId: createId("sendjob"),
          recipients: payloadRecipients,
        }),
      });

      const data = (await response.json()) as BulkSendResponse;

      if (!response.ok || !data.ok || !data.data) {
        throw new Error(data.error ?? "Bulk send failed.");
      }

      applySendResults(data.data.results);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Bulk send failed.";

      applySendResults(
        eligibleIds.map((id) => ({
          recipientId: id,
          status: "failed" as const,
          errorMessage: message,
        })),
      );
      setError(message);
    }
  }, [
    applySendResults,
    campaign,
    checkedUnsentIds,
    markRecipientsQueued,
    markRecipientsSending,
    recipientsById,
  ]);

  const retryFailed = useCallback(() => {
    if (failedIds.length === 0) {
      return;
    }

    toggleRecipientsChecked(failedIds, true);
  }, [failedIds, toggleRecipientsChecked]);

  const summary = useMemo(
    () => ({
      checkedCount: checkedUnsentIds.length,
      failedCount: failedIds.length,
      isSending: ui.isSending,
      progress: ui.sendProgress,
    }),
    [checkedUnsentIds.length, failedIds.length, ui.isSending, ui.sendProgress],
  );

  return {
    ...summary,
    error,
    sendSelected,
    retryFailed,
  };
}
