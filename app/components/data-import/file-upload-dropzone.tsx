"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { AiSettingsTrigger } from "@/components/settings/ai-settings-trigger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FileUploadDropzoneProps } from "@/types/file-upload-dropzone";

export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const {
    error,
    isImporting,
    notice,
    onFilesSelect,
    onRestoreSavedFile,
    savedWorkbookLabel,
  } = props;

  return (
    <Card className="border-dashed bg-white/85">
      <CardHeader className="gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <FileSpreadsheet className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-3xl">Upload your lead file</CardTitle>
        <CardDescription className="max-w-2xl text-base">
          Import one or more CSV or Excel files, map the email column, define one global
          template, then edit and send individual drafts from the same session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
          <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
          <span className="text-base font-medium">Choose CSV or Excel files</span>
          <span className="mt-2 text-sm text-muted-foreground">
            Supports `.csv`, `.xlsx`, `.xls`
          </span>
          <input
            className="sr-only"
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={(event) => {
              void onFilesSelect(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="secondary"
            disabled={isImporting}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.xlsx,.xls";
              input.multiple = true;
              input.onchange = () => {
                void onFilesSelect(input.files);
                input.value = "";
              };
              input.click();
            }}
          >
            {isImporting ? "Parsing files..." : "Select files"}
          </Button>
          {savedWorkbookLabel ? (
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={onRestoreSavedFile}
            >
              Use saved file
            </Button>
          ) : null}
          <span>
            The last uploaded workbook is saved locally in this browser for reuse.
          </span>
        </div>
        {savedWorkbookLabel ? (
          <p className="text-sm text-muted-foreground">
            Saved workbook set: <span className="font-medium text-foreground">{savedWorkbookLabel}</span>
          </p>
        ) : null}
        <AiSettingsTrigger context="upload" />
        {notice ? <p className="text-sm text-amber-700">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
