import type { Campaign } from "@/types/campaign";

export interface CampaignComposeDialogSubmitPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  applyMode: "untouched" | "all";
}

export interface CampaignComposeDialogProps {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onSubmit: (payload: CampaignComposeDialogSubmitPayload) => void;
}
