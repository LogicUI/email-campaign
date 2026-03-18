"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientById } from "@/store/selectors";

export function useRecipientEditor(recipientId: string) {
  const recipient = useCampaignStore(selectRecipientById(recipientId));
  const updateRecipientBody = useCampaignStore((state) => state.updateRecipientBody);
  const updateRecipientSubject = useCampaignStore((state) => state.updateRecipientSubject);
  const toggleRecipientChecked = useCampaignStore((state) => state.toggleRecipientChecked);

  const callbacks = useMemo(
    () => ({
      onBodyChange: (body: string) => updateRecipientBody(recipientId, body),
      onSubjectChange: (subject: string) => updateRecipientSubject(recipientId, subject),
      onCheckedChange: (checked: boolean) => toggleRecipientChecked(recipientId, checked),
    }),
    [recipientId, toggleRecipientChecked, updateRecipientBody, updateRecipientSubject],
  );

  return {
    recipient,
    ...callbacks,
  };
}
