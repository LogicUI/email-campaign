import type { SendStatus } from "@/types/campaign";

export interface RecipientCardToolbarProps {
  checked: boolean;
  disabled?: boolean;
  status: SendStatus;
  sent: boolean;
  onCheckedChange: (checked: boolean) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}
