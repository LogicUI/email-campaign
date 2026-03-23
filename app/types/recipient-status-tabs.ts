import type { RecipientStatusView } from "@/types/campaign-store";

export interface RecipientStatusTabsProps {
  sentCount: number;
  unsentCount: number;
  value: RecipientStatusView;
  onValueChange: (value: RecipientStatusView) => void;
}
