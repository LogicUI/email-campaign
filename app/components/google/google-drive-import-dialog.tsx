"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderSearch, LoaderCircle, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useGoogleDriveFilesQuery, useGoogleSheetWorksheetsQuery, useImportGoogleSheetMutation } from "@/tanStack/google";
import type { ImportPreview } from "@/types/campaign";

export function GoogleDriveImportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (preview: ImportPreview) => void;
}) {
  const { onImported, onOpenChange, open } = props;
  const [search, setSearch] = useState("");
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [selectedWorksheetTitle, setSelectedWorksheetTitle] = useState("");
  const previousOpenRef = useRef(open);
  const driveFilesQuery = useGoogleDriveFilesQuery(search, open);
  const worksheetsQuery = useGoogleSheetWorksheetsQuery(selectedSpreadsheetId, open);
  const importMutation = useImportGoogleSheetMutation();
  const files = useMemo(() => driveFilesQuery.data ?? [], [driveFilesQuery.data]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (wasOpen && !open) {
      setSearch("");
      setSelectedSpreadsheetId("");
      setSelectedWorksheetTitle("");
      importMutation.reset();
    }
  }, [open, importMutation]);

  useEffect(() => {
    if (!selectedSpreadsheetId) {
      setSelectedWorksheetTitle("");
      return;
    }

    if (worksheetsQuery.data?.worksheets.length) {
      setSelectedWorksheetTitle((current) =>
        current || worksheetsQuery.data?.worksheets[0]?.title || "",
      );
    }
  }, [selectedSpreadsheetId, worksheetsQuery.data?.worksheets]);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedSpreadsheetId) ?? null,
    [files, selectedSpreadsheetId],
  );
  const error = (driveFilesQuery.error ?? worksheetsQuery.error ?? importMutation.error) as
    | Error
    | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,42rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSearch className="h-5 w-5" />
            Import from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Browse spreadsheets in your Google Drive, choose a worksheet, and import
            it into the same preview flow as file uploads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-drive-search">Search spreadsheets</Label>
            <Input
              id="google-drive-search"
              placeholder="Search by file name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-sheet-file">Spreadsheet</Label>
            <Select
              id="google-sheet-file"
              value={selectedSpreadsheetId}
              onChange={(event) => {
                setSelectedSpreadsheetId(event.target.value);
                setSelectedWorksheetTitle("");
              }}
            >
              <option value="">
                {driveFilesQuery.isLoading ? "Loading spreadsheets..." : "Select a spreadsheet"}
              </option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-sheet-worksheet">Worksheet</Label>
            <Select
              id="google-sheet-worksheet"
              value={selectedWorksheetTitle}
              disabled={!selectedSpreadsheetId}
              onChange={(event) => setSelectedWorksheetTitle(event.target.value)}
            >
              <option value="">
                {worksheetsQuery.isLoading
                  ? "Loading worksheets..."
                  : "Select a worksheet"}
              </option>
              {(worksheetsQuery.data?.worksheets ?? []).map((worksheet) => (
                <option key={worksheet.sheetId} value={worksheet.title}>
                  {worksheet.title}
                </option>
              ))}
            </Select>
          </div>

          {selectedFile ? (
            <div className="rounded-xl border bg-muted/35 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="mt-1">
                {(worksheetsQuery.data?.worksheets.length ?? 0)} worksheet
                {(worksheetsQuery.data?.worksheets.length ?? 0) === 1 ? "" : "s"} available
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error.message}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !selectedSpreadsheetId ||
              !selectedWorksheetTitle ||
              importMutation.isPending
            }
            onClick={async () => {
              const payload = await importMutation.mutateAsync({
                spreadsheetId: selectedSpreadsheetId,
                worksheetTitle: selectedWorksheetTitle,
              });

              onImported(payload.preview);
              onOpenChange(false);
            }}
          >
            {importMutation.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Sheet className="h-4 w-4" />
                Import worksheet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
