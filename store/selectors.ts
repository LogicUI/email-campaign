import type { CampaignStore } from "@/store/campaign-store";

export const selectCampaign = (state: CampaignStore) => state.campaign;
export const selectImportPreview = (state: CampaignStore) => state.importPreview;
export const selectUi = (state: CampaignStore) => state.ui;
export const selectRecipientOrder = (state: CampaignStore) => state.recipientOrder;

export const selectRecipientById = (id: string) => (state: CampaignStore) =>
  state.recipientsById[id];

export const selectCheckedUnsentRecipientIds = (state: CampaignStore) =>
  state.recipientOrder.filter((id) => {
    const recipient = state.recipientsById[id];
    return recipient?.checked && !recipient.sent && recipient.status !== "sending";
  });

export const selectFailedRecipientIds = (state: CampaignStore) =>
  state.recipientOrder.filter((id) => state.recipientsById[id]?.status === "failed");
