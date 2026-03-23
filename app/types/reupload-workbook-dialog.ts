import type { SavedWorkbookRecord } from "@/types/campaign";

export interface ReuploadWorkbookDialogProps {
  canAddFiles: boolean;
  open: boolean;
  savedWorkbook: SavedWorkbookRecord | null;
  onAddFiles: () => void;
  onChooseDifferentFile: () => void;
  onOpenChange: (open: boolean) => void;
  onUseSavedFile: () => void;
  onRemoveSavedFiles?: (fileKeys: string[]) => Promise<SavedWorkbookRecord | null>;
}
