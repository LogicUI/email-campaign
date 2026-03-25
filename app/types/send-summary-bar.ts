import type { CampaignSendProgress } from "@/types/campaign-store";

export interface SendSummaryBarProps {
  checkedCount: number;
  failedCount: number;
  isSending: boolean;
  progress: CampaignSendProgress;
  error?: string | null;
  onAddRecipient: () => void;
  onClearAllSelected: () => void;
  onSendSelected: () => void;
  hasUnsavedImport: boolean;
  onSaveToDatabase?: () => void;
}
