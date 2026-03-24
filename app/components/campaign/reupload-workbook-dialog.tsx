"use client";

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
import type { ReuploadWorkbookDialogProps } from "@/types/reupload-workbook-dialog";

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

  const handleRemoveFile = async (fileKey: string) => {
    if (!onRemoveSavedFiles) return;

    const fileToRemove = savedWorkbook?.files.find(
      (f) => `${f.fileName}-${f.lastModified}` === fileKey
    );

    if (!fileToRemove) return;

    await onRemoveSavedFiles([fileKey]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px] p-4 sm:p-6">
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

                return (
                  <div
                    key={fileKey}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-white/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatSavedWorkbookSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(fileKey)}
                      className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove file"
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

