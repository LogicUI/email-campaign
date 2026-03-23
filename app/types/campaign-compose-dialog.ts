import type { Attachment } from "@/types/gmail";
import type { Campaign, ImportPreview } from "@/types/campaign";

export interface CampaignComposeDialogSubmitPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  globalCcEmails?: string[];
  globalAttachments?: Attachment[];
  applyMode: "untouched" | "all";
}

export interface CampaignComposeDialogProps {
  open: boolean;
  campaign: Campaign | null;
  preview?: ImportPreview | null;
  onClose: () => void;
  onSubmit: (payload: CampaignComposeDialogSubmitPayload) => void;
}
