"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FileUploadDropzoneProps {
  isImporting: boolean;
  error?: string | null;
  onFileSelect: (file: File | null) => void;
}

export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const { error, isImporting, onFileSelect } = props;

  return (
    <Card className="border-dashed bg-white/85">
      <CardHeader className="gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <FileSpreadsheet className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-3xl">Upload your lead file</CardTitle>
        <CardDescription className="max-w-2xl text-base">
          Import a CSV or Excel file, map the email column, define one global template,
          then edit and send individual drafts from the same session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
          <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
          <span className="text-base font-medium">Choose CSV or Excel file</span>
          <span className="mt-2 text-sm text-muted-foreground">
            Supports `.csv`, `.xlsx`, `.xls`
          </span>
          <input
            className="sr-only"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
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
              input.onchange = () => onFileSelect(input.files?.[0] ?? null);
              input.click();
            }}
          >
            {isImporting ? "Parsing file..." : "Select file"}
          </Button>
          <span>All recipient data stays in memory until the page refreshes.</span>
        </div>
      </CardContent>
    </Card>
  );
}
