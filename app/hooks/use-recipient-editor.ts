"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientById } from "@/store/selectors";

export function useRecipientEditor(recipientId: string) {
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const removeRecipient = useCampaignStore((state) => state.removeRecipient);
  const updateRecipientEmail = useCampaignStore((state) => state.updateRecipientEmail);
  const updateRecipientBody = useCampaignStore((state) => state.updateRecipientBody);
  const updateRecipientSubject = useCampaignStore((state) => state.updateRecipientSubject);
  const toggleRecipientChecked = useCampaignStore((state) => state.toggleRecipientChecked);

  const callbacks = useMemo(
    () => ({
      onRemove: () => removeRecipient(recipientId),
      onEmailChange: (email: string) => updateRecipientEmail(recipientId, email),
      onBodyChange: (body: string) => updateRecipientBody(recipientId, body),
      onSubjectChange: (subject: string) => updateRecipientSubject(recipientId, subject),
      onCheckedChange: (checked: boolean) => toggleRecipientChecked(recipientId, checked),
    }),
    [
      recipientId,
      removeRecipient,
      toggleRecipientChecked,
      updateRecipientBody,
      updateRecipientEmail,
      updateRecipientSubject,
    ],
  );

  return {
    recipient,
    ...callbacks,
  };
}
