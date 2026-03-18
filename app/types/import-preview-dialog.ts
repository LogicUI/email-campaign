import type { ImportPreview } from "@/types/campaign";

export interface ImportPreviewDialogProps {
  open: boolean;
  preview: ImportPreview | null;
  onClose: () => void;
  onEmailColumnChange: (column: string) => void;
  onContinue: () => void;
}
