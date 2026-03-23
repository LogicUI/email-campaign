"use client";

import { FileUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fileToAttachment } from "@/core/email/attachment-utils";
import { validateFileBeforeUpload } from "./attachment-validation";
import type { Attachment } from "@/types/gmail";

interface AttachmentUploadProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  error?: string;
  onErrorChange?: (error: string | undefined) => void;
  disabled?: boolean;
}

/**
 * AttachmentUpload Component
 *
 * Features:
 * - Drag-and-drop zone for file uploads
 * - Click to browse files
 * - Multiple file selection support
 * - Real-time file validation (size, count, type)
 * - Error display with user-friendly messages
 */
export function AttachmentUpload({
  attachments,
  onAttachmentsChange,
  error,
  onErrorChange,
  disabled = false,
}: AttachmentUploadProps) {
  /**
   * Handles file selection from both drag-and-drop and file input
   */
  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Clear any existing error
    onErrorChange?.(undefined);

    const newAttachments: Attachment[] = [];
    let runningTotal = attachments.reduce((sum, att) => sum + (att.size || 0), 0);

    for (const file of Array.from(files)) {
      // Validate file before conversion
      const validation = validateFileBeforeUpload(file, [
        ...attachments,
        ...newAttachments,
      ]);

      if (!validation.valid) {
        onErrorChange?.(validation.error);
        return;
      }

      try {
        // Convert file to attachment (base64 encoding)
        const attachment = await fileToAttachment(file);
        newAttachments.push(attachment);
        runningTotal += file.size;
      } catch (err) {
        onErrorChange?.(
          `Failed to process "${file.name}": ${err instanceof Error ? err.message : "Unknown error"}`
        );
        return;
      }
    }

    // Add all valid attachments
    onAttachmentsChange([...attachments, ...newAttachments]);
  };

  /**
   * Handles drag-over event
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * Handles drag-leave event
   */
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * Handles drop event
   */
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    const files = event.dataTransfer.files;
    void handleFilesSelect(files);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attachment-upload">Attachments (optional)</Label>

      {/* Drag-and-drop zone */}
      <label
        htmlFor="attachment-upload"
        className={`
          flex cursor-pointer flex-col items-center justify-center
          rounded-lg border border-dashed px-4 py-6 text-center
          transition-colors
          ${
            disabled
              ? "bg-muted/50 opacity-50 cursor-not-allowed"
              : "bg-muted/30 hover:bg-muted/50"
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FileUp className="mb-2 h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium">
          Drag files here or click to upload
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          Images, documents, spreadsheets (max 18 MB per file, 10 files total)
        </span>
        <input
          id="attachment-upload"
          className="sr-only"
          type="file"
          multiple
          disabled={disabled}
          onChange={(event) => {
            void handleFilesSelect(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {/* Error display */}
      {error ? (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => onErrorChange?.(undefined)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Dismiss error</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
