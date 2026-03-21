import type { Campaign, ImportPreview } from "@/types/campaign";

export interface CampaignComposeDialogSubmitPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  applyMode: "untouched" | "all";
}

export interface CampaignComposeDialogProps {
  open: boolean;
  campaign: Campaign | null;
  preview?: ImportPreview | null;
  onClose: () => void;
  onSubmit: (payload: CampaignComposeDialogSubmitPayload) => void;
}
