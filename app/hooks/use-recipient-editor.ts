"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientById } from "@/store/selectors";
import type { CampaignRecipient } from "@/types/campaign";

export function useRecipientEditor(recipientId: string) {
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const removeRecipient = useCampaignStore((state) => state.removeRecipient);
  const updateRecipientEmail = useCampaignStore((state) => state.updateRecipientEmail);
  const updateRecipientBody = useCampaignStore((state) => state.updateRecipientBody);
  const updateRecipientBodyWithJson = useCampaignStore((state) => state.updateRecipientBodyWithJson);
  const updateRecipientSubject = useCampaignStore((state) => state.updateRecipientSubject);
  const updateRecipientCcEmails = useCampaignStore((state) => state.updateRecipientCcEmails);
  const updateRecipientAttachments = useCampaignStore((state) => state.updateRecipientAttachments);
  const toggleRecipientChecked = useCampaignStore((state) => state.toggleRecipientChecked);

  const callbacks = useMemo(
    () => ({
      onRemove: () => removeRecipient(recipientId),
      onEmailChange: (email: string) => updateRecipientEmail(recipientId, email),
      onBodyChange: (body: string) => updateRecipientBody(recipientId, body),
      onBodyChangeWithJson: (body: string, bodyEditorJson?: string) => updateRecipientBodyWithJson(recipientId, body, bodyEditorJson),
      onSubjectChange: (subject: string) => updateRecipientSubject(recipientId, subject),
      onCcEmailsChange: (ccEmails: string[]) => updateRecipientCcEmails(recipientId, ccEmails),
      onAttachmentsChange: (attachments: CampaignRecipient["attachments"]) => updateRecipientAttachments(recipientId, attachments),
      onCheckedChange: (checked: boolean) => toggleRecipientChecked(recipientId, checked),
    }),
    [
      recipientId,
      removeRecipient,
      toggleRecipientChecked,
      updateRecipientBody,
      updateRecipientBodyWithJson,
      updateRecipientCcEmails,
      updateRecipientEmail,
      updateRecipientSubject,
      updateRecipientAttachments,
    ],
  );

  return {
    recipient,
    ...callbacks,
  };
}
