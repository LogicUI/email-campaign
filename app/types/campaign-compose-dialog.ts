import type { Attachment } from "@/types/gmail";
import type { Campaign, ImportPreview } from "@/types/campaign";

export interface CampaignComposeDialogSubmitPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  globalBodyEditorJson?: string; // TipTap JSON for rich text editing
  globalCcEmails?: string[];
  globalAttachments?: Attachment[];
}

export interface CampaignComposeDialogProps {
  open: boolean;
  campaign: Campaign | null;
  preview?: ImportPreview | null;
  senderEmail: string;
  onClose: () => void;
  onSubmit: (payload: CampaignComposeDialogSubmitPayload) => void;
}
