import type { CampaignStore } from "@/types/campaign-store";

export const selectCampaign = (state: CampaignStore) => state.campaign;
export const selectImportPreview = (state: CampaignStore) => state.importPreview;
export const selectUi = (state: CampaignStore) => state.ui;
export const selectRecipientOrder = (state: CampaignStore) => state.recipientOrder;
export const selectRecipientsById = (state: CampaignStore) => state.recipientsById;

export const selectRecipientById = (id: string) => (state: CampaignStore) =>
  state.recipientsById[id];

