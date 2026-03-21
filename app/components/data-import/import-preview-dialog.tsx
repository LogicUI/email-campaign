"use client";

import { useRef } from "react";
import { X } from "lucide-react";

import { InvalidRowAlert } from "@/components/data-import/invalid-row-alert";
import { ImportPreviewTable } from "@/components/data-import/import-preview-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import type { ImportPreviewDialogProps } from "@/types/import-preview-dialog";

export function ImportPreviewDialog(props: ImportPreviewDialogProps) {
  const {
    open,
    preview,
    onClose,
    onAddFiles,
    onRemoveFile,
    onEmailColumnChange,
    onRecipientColumnChange,
    isImporting = false,
    onSaveToDatabase,
    onContinue,
  } = props;
  const addFilesInputRef = useRef<HTMLInputElement | null>(null);

  if (!preview) {
    return null;
  }

  const columns = preview.headers;
  const fileRowCounts = new Map<string, number>();
  preview.sourceRows.forEach((row) => {
    fileRowCounts.set(row.sourceFileName, (fileRowCounts.get(row.sourceFileName) ?? 0) + 1);
  });
  const invalidRows = preview.rows
    .filter((row) => !row.isValid && row.invalidReason)
    .map((row) => ({
      rowIndex: row.rowIndex,
      sourceFileName: row.sourceFileName,
      email: row.email,
      reason: row.invalidReason ?? "Invalid row.",
    }));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="flex flex-col max-h-[90vh] w-[min(96vw,1280px)] p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">Review imported rows</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Confirm the delivery and addressee columns before generating recipient
            drafts from{" "}
            <span className="font-medium text-foreground">{preview.fileName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid gap-3 sm:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
          <div className="min-w-0 flex-1 overflow-x-auto space-y-3 sm:space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3 sm:p-4">
              <p className="text-sm font-medium">Import summary</p>
              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{preview.rows.length} rows</Badge>
                <Badge variant="success" className="text-[10px] sm:text-xs">{preview.validCount} valid</Badge>
                <Badge variant={preview.invalidCount > 0 ? "warning" : "secondary"} className="text-[10px] sm:text-xs">
                  {preview.invalidCount} invalid
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {preview.sourceFiles.length} file{preview.sourceFiles.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Uploaded files</p>
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {preview.sourceFiles.length} active
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {preview.sourceFiles.map((file) => (
                  <div
                    key={`${file.fileName}-${file.sheetName ?? "sheet"}`}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        {file.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">
                        {file.sheetName ? `${file.sheetName} · ` : ""}
                        {fileRowCounts.get(file.fileName) ?? 0} row
                        {(fileRowCounts.get(file.fileName) ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isImporting}
                      aria-label={`Remove ${file.fileName}`}
                      className="h-8 w-8 shrink-0 rounded-full"
                      onClick={() => onRemoveFile(file.fileName)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email-column" className="text-xs sm:text-sm">Email column</Label>
              <Select
                id="email-column"
                value={preview.selectedEmailColumn ?? ""}
                onChange={(event) => onEmailColumnChange(event.target.value)}
                className="text-xs sm:text-sm"
              >
                <option value="">Select a column</option>
                {columns.map((header) => (
                  <option
                    key={header}
                    value={header}
                    disabled={header === preview.selectedRecipientColumn}
                  >
                    {header}
                  </option>
                ))}
              </Select>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                This column is used to deliver each email.
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="recipient-column" className="text-xs sm:text-sm">Recipient / addressee column</Label>
              <Select
                id="recipient-column"
                value={preview.selectedRecipientColumn ?? ""}
                onChange={(event) => onRecipientColumnChange(event.target.value)}
                className="text-xs sm:text-sm"
              >
                <option value="">Select a column</option>
                {columns.map((header) => (
                  <option
                    key={header}
                    value={header}
                    disabled={header === preview.selectedEmailColumn}
                  >
                    {header}
                  </option>
                ))}
              </Select>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                This column is used for greetings, preview titles, and default
                personalization.
              </p>
            </div>

            <InvalidRowAlert invalidCount={preview.invalidCount} rows={invalidRows} />
          </div>

          <ScrollArea className="h-full rounded-xl border bg-background">
            <ImportPreviewTable preview={preview} />
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3 flex-shrink-0">
          <input
            ref={addFilesInputRef}
            className="sr-only"
            type="file"
            aria-label="Add more files"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={(event) => {
              onAddFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-xs sm:text-sm">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => addFilesInputRef.current?.click()}
            disabled={isImporting}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {isImporting ? "Parsing files..." : "Add more files"}
          </Button>
          <Button
            variant="outline"
            onClick={onSaveToDatabase}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Save to database
          </Button>
          <Button
            onClick={onContinue}
            disabled={
              !preview.selectedEmailColumn ||
              !preview.selectedRecipientColumn ||
              preview.validCount === 0
            }
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Continue to message setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
