import type { ImportPreview } from "@/types/campaign";

export interface ImportPreviewDialogProps {
  open: boolean;
  preview: ImportPreview | null;
  onClose: () => void;
  onAddFiles: (files: FileList | File[] | null) => void;
  onRemoveFile: (fileName: string) => void;
  onEmailColumnChange: (column: string) => void;
  onRecipientColumnChange: (column: string) => void;
  isImporting?: boolean;
  onContinue: () => void;
}
