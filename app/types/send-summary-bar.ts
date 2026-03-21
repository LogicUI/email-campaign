import type { CampaignSendProgress } from "@/types/campaign-store";

export interface SendSummaryBarProps {
  canSaveResultsToGoogle?: boolean;
  checkedCount: number;
  failedCount: number;
  isSending: boolean;
  progress: CampaignSendProgress;
  error?: string | null;
  onAddRecipient: () => void;
  onClearAllSelected: () => void;
  onSaveResultsToGoogle?: () => void;
  onSendSelected: () => void;
  onRetryFailed: () => void;
}
