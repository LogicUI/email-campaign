"use client";

import { useCallback, useMemo, useState } from "react";

import { validateRecipient } from "@/core/campaign/validate-recipient";
import { buildTemplatedEmailPreviewModel } from "@/core/email/email-preview";
import { createId } from "@/core/utils/ids";
import { useCampaignSync } from "@/hooks/use-campaign-sync";
import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectRecipientOrder, selectUi } from "@/store/selectors";
import { useSendBulkMutation } from "@/tanStack/send";
import type { SendPayloadRecipient } from "@/types/api";

/**
 * Coordinates the bulk-send workflow for the current workspace.
 *
 * The hook is responsible for selecting valid checked recipients, calling the Gmail
 * bulk-send API, updating recipient statuses in the store, and then deciding whether
 * campaign history should be synced automatically or left pending for manual sync.
 *
 * @param options.onSavedDataChange Optional callback used after auto-sync succeeds so
 * surrounding dashboard data can refresh.
 * @returns Send actions, summary counts, progress state, and any send error message.
 */
export function useBulkSend(options?: {
  onSavedDataChange?: () => Promise<unknown> | void;
}) {
  const campaign = useCampaignStore(selectCampaign);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
  const recipientsById = useCampaignStore((state) => state.recipientsById);
  const ui = useCampaignStore(selectUi);
  const markRecipientsQueued = useCampaignStore((state) => state.markRecipientsQueued);
  const markRecipientsSending = useCampaignStore((state) => state.markRecipientsSending);
  const applySendResults = useCampaignStore((state) => state.applySendResults);
  const markDatabaseSyncPending = useCampaignStore((state) => state.markDatabaseSyncPending);
  const toggleRecipientsChecked = useCampaignStore((state) => state.toggleRecipientsChecked);
  const setSending = useCampaignStore((state) => state.setSending);
  const { activeConnection, syncCurrentCampaign } = useCampaignSync(options);
  const [validationError, setValidationError] = useState<string | null>(null);
  const sendBulkMutation = useSendBulkMutation();

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

  /**
   * Sends all currently checked and valid recipients through the bulk-send API.
   *
   * This is the main send entry point used by the campaign UI. It validates that the
   * selected recipients are sendable, updates optimistic sending state, applies final
   * API results back into the store, and then either auto-syncs campaign history or
   * flags the campaign as needing manual sync.
   *
   * @returns Promise that resolves once send handling and optional auto-sync finish.
   */
  const sendSelected = useCallback(async () => {
    if (!campaign) {
      return;
    }

    const eligibleIds = checkedUnsentIds.filter((id) => {
      const recipient = recipientsById[id];
      return Boolean(recipient) && !validateRecipient(recipient.email, recipient.subject, recipient.body);
    });

    if (eligibleIds.length === 0) {
      setValidationError("No valid checked recipients are ready to send.");
      return;
    }

    const payloadRecipients: SendPayloadRecipient[] = eligibleIds.map((id) => {
      const recipient = recipientsById[id];

      // Merge recipient attachments with global attachments
      // If recipient has no attachments, use global attachments
      // This ensures attachments are always included during bulk send
      const attachments = recipient.attachments && recipient.attachments.length > 0
        ? recipient.attachments
        : campaign?.globalAttachments;
      const resolvedEmail = buildTemplatedEmailPreviewModel({
        subject: recipient.subject,
        body: recipient.body,
        attachments: attachments ?? [],
        fields: recipient.fields,
      });

      return {
        id: recipient.id,
        email: recipient.email,
        subject: resolvedEmail.subject,
        body: resolvedEmail.body,
        bodyHtml: resolvedEmail.bodyHtml,
        bodyText: resolvedEmail.bodyText,
        ccEmails: recipient.ccEmails,
        attachments,
      };
    });

    setValidationError(null);
    setSending(true);
    markRecipientsQueued(eligibleIds);
    markRecipientsSending(eligibleIds);

    try {
      const data = await sendBulkMutation.mutateAsync({
        campaignId: campaign.id,
        sendJobId: createId("sendjob"),
        recipients: payloadRecipients,
      });

      applySendResults(data.results);

      if (activeConnection?.syncMode === "auto" && activeConnection.profileId) {
        await syncCurrentCampaign({
          sentAt: new Date().toISOString(),
          silentWhenDisconnected: true,
        });
      } else {
        markDatabaseSyncPending();
      }
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
    }
  }, [
    applySendResults,
    campaign,
    checkedUnsentIds,
    markRecipientsQueued,
    markRecipientsSending,
    activeConnection,
    markDatabaseSyncPending,
    recipientsById,
    setSending,
    sendBulkMutation,
    syncCurrentCampaign,
  ]);

  /**
   * Re-checks all failed recipients so the user can quickly retry them.
   *
   * This exists as a convenience action for the send summary bar.
   */
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
    error:
      validationError ??
      (sendBulkMutation.error instanceof Error ? sendBulkMutation.error.message : null),
    sendSelected,
    retryFailed,
  };
}
