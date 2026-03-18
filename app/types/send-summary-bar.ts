import type { CampaignSendProgress } from "@/types/campaign-store";

export interface SendSummaryBarProps {
  checkedCount: number;
  failedCount: number;
  isSending: boolean;
  progress: CampaignSendProgress;
  error?: string | null;
  onSendSelected: () => void;
  onRetryFailed: () => void;
  onCheckVisible: () => void;
  onUncheckVisible: () => void;
}
