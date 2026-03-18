import type { Campaign } from "@/types/campaign";

export interface CampaignHeaderBarProps {
  campaign: Campaign;
  totalRecipients: number;
  onEditTemplate: () => void;
  onReset: () => void;
}
