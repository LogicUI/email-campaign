"use client";

import { useState, useEffect } from "react";
import type { SavedWorkbookRecord } from "@/types/campaign";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReuploadWorkbookDialogProps {
  canAddFiles: boolean;
  open: boolean;
  savedWorkbook: SavedWorkbookRecord | null;
  onAddFiles: () => void;
  onChooseDifferentFile: () => void;
  onOpenChange: (open: boolean) => void;
  onUseSavedFile: () => void;
  onRemoveSavedFiles?: (fileKeys: string[]) => Promise<SavedWorkbookRecord | null>;
}

/**
 * Formats a saved workbook file size into a compact UI label.
 *
 * This helper exists purely for readability in the reupload dialog where several
 * saved files may be listed at once.
 *
 * @param size File size in bytes.
 * @returns Human-readable size label in B, KB, or MB.
 */
function formatSavedWorkbookSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

/**
 * Dialog that lets the user append files, replace files, or restore the saved workbook bundle.
 *
 * This component exists because "Reupload new" is no longer a single destructive
 * reset action. The dialog surfaces the current saved workbook context so the user
 * can decide whether to keep building on the existing upload set or start over.
 *
 * @param props.canAddFiles Whether the current workflow supports appending files.
 * @param props.open Whether the dialog is open.
 * @param props.savedWorkbook Browser-saved workbook bundle, if available.
 * @param props.onAddFiles Opens the append-files flow.
 * @param props.onChooseDifferentFile Opens the replace-files flow.
 * @param props.onOpenChange Standard dialog open-state handler.
 * @param props.onUseSavedFile Restores the saved workbook bundle into the workspace.
 * @returns Rendered reupload workbook dialog.
 */
export function ReuploadWorkbookDialog(props: ReuploadWorkbookDialogProps) {
  const {
    canAddFiles,
    open,
    savedWorkbook,
    onAddFiles,
    onChooseDifferentFile,
    onOpenChange,
    onUseSavedFile,
    onRemoveSavedFiles,
  } = props;

  const [filesToRemove, setFilesToRemove] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Reset files to remove when dialog opens
  useEffect(() => {
    if (open) {
      setFilesToRemove(new Set());
    }
  }, [open]);

  const toggleFileRemove = (fileKey: string) => {
    setFilesToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(fileKey)) {
        next.delete(fileKey);
      } else {
        next.add(fileKey);
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (filesToRemove.size === 0 || !onRemoveSavedFiles) {
      return;
    }

    setIsSaving(true);
    try {
      await onRemoveSavedFiles(Array.from(filesToRemove));
      setFilesToRemove(new Set());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Reupload workbook</DialogTitle>
          <DialogDescription>
            Add more files to the current upload set, reuse the saved workbook, or replace it with a new file set.
          </DialogDescription>
        </DialogHeader>

        {savedWorkbook ? (
          <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">
              {savedWorkbook.files.length === 1
                ? savedWorkbook.files[0].fileName
                : `${savedWorkbook.files.length} saved files`}
            </p>
            <p className="mt-2 text-muted-foreground">
              Saved {new Date(savedWorkbook.savedAt).toLocaleString()}
            </p>
            <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              {savedWorkbook.files.map((file) => {
                const fileKey = `${file.fileName}-${file.lastModified}`;
                const isRemoved = filesToRemove.has(fileKey);

                return (
                  <div
                    key={fileKey}
                    className={`flex items-center justify-between gap-2 rounded-xl border bg-white/80 px-3 py-2 transition-opacity ${
                      isRemoved ? "opacity-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatSavedWorkbookSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFileRemove(fileKey)}
                      className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={isRemoved ? "Undo remove" : "Remove file"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            No browser-saved workbook is available right now. You can still add more files
            to the current upload set or replace it completely.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {filesToRemove.size > 0 && onRemoveSavedFiles ? (
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : `Save changes (${filesToRemove.size})`}
            </Button>
          ) : null}
          {canAddFiles ? (
            <Button variant="outline" onClick={onAddFiles}>
              Add new files
            </Button>
          ) : null}
          <Button variant="outline" onClick={onChooseDifferentFile}>
            Replace with new files
          </Button>
          {savedWorkbook ? <Button onClick={onUseSavedFile}>Use saved file</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
