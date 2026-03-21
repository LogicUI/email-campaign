"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectCampaign, selectImportPreview, selectUi } from "@/store/selectors";

export function useCampaignBuilder() {
  const campaign = useCampaignStore(selectCampaign);
  const preview = useCampaignStore(selectImportPreview);
  const ui = useCampaignStore(selectUi);
  const openComposeDialog = useCampaignStore((state) => state.openComposeDialog);
  const closeComposeDialog = useCampaignStore((state) => state.closeComposeDialog);
  const createCampaignFromPreview = useCampaignStore(
    (state) => state.createCampaignFromPreview,
  );
  const updateGlobalTemplate = useCampaignStore((state) => state.updateGlobalTemplate);
  const addManualRecipient = useCampaignStore((state) => state.addManualRecipient);
  const resetSession = useCampaignStore((state) => state.resetSession);

  const canStartCampaign = useMemo(
    () =>
      Boolean(
        preview &&
          preview.validCount > 0 &&
          preview.selectedEmailColumn &&
          preview.selectedRecipientColumn,
      ),
    [preview],
  );

  return {
    campaign,
    preview,
    composeDialogOpen: ui.composeDialogOpen,
    canStartCampaign,
    openComposeDialog,
    closeComposeDialog,
    createCampaignFromPreview,
    updateGlobalTemplate,
    addManualRecipient,
    resetSession,
  };
}
