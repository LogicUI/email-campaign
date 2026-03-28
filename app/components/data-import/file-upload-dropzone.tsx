"use client";

import { useRef } from "react";
import { Database, Sheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FileUploadDropzoneProps } from "@/types/file-upload-dropzone";

export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    error,
    isImporting,
    notice,
    onFilesSelect,
    onImportFromDatabase,
    onImportFromGoogle,
    onRestoreSavedFile,
    savedWorkbookLabel,
  } = props;

  return (
    <Card className="border-dashed bg-white/85">
      <CardContent className="space-y-4 p-8">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-6 text-left transition-all hover:border-primary/40 hover:bg-white/90 hover:shadow-md disabled:opacity-50 disabled:hover:border-border/60 disabled:hover:bg-white/70 disabled:hover:shadow-none"
            disabled={isImporting}
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-medium">Upload CSV files</p>
            </div>
          </button>

          {onImportFromGoogle ? (
            <button
              type="button"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-6 text-left transition-all hover:border-primary/40 hover:bg-white/90 hover:shadow-md disabled:opacity-50 disabled:hover:border-border/60 disabled:hover:bg-white/70 disabled:hover:shadow-none"
              disabled={isImporting}
              onClick={onImportFromGoogle}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                <Sheet className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">Google Sheets</p>
              </div>
            </button>
          ) : null}

          {onImportFromDatabase ? (
            <button
              type="button"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-6 text-left transition-all hover:border-primary/40 hover:bg-white/90 hover:shadow-md disabled:opacity-50 disabled:hover:border-border/60 disabled:hover:bg-white/70 disabled:hover:shadow-none"
              disabled={isImporting}
              onClick={onImportFromDatabase}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">Database</p>
              </div>
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          id="file-upload-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          aria-label="Choose CSV or Excel file"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void onFilesSelect(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
          <span className={savedWorkbookLabel ? "" : "w-full text-center"}>
            The last uploaded workbook is saved locally in this browser for reuse.
          </span>
        </div>

        {savedWorkbookLabel ? (
          <p className="text-sm text-muted-foreground">
            Saved workbook set: <span className="font-medium text-foreground">{savedWorkbookLabel}</span>
          </p>
        ) : null}
        {notice ? <p className="text-sm text-amber-700">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
