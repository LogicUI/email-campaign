"use client";

import {
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateAttachmentSizeInfo } from "./attachment-validation";
import {
  formatBytes,
  isImageAttachment,
  MAX_ATTACHMENTS_PER_EMAIL,
} from "@/core/email/attachment-utils";
import type { Attachment } from "@/types/gmail";

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
  onToggleInline?: (index: number, isInline: boolean) => void;
}

/**
 * Gets the appropriate icon for a file based on its MIME type
 */
function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return FileImage;
  }
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType.includes("csv")
  ) {
    return FileSpreadsheet;
  }
  if (
    contentType.includes("pdf") ||
    contentType.includes("document") ||
    contentType.includes("text")
  ) {
    return FileText;
  }
  return File;
}

/**
 * AttachmentSizeIndicator Component
 *
 * Shows:
 * - Attachment count (X / 10)
 * - Total size (raw and encoded)
 * - Progress bar with color coding
 * - Percentage of Gmail's 25 MB limit
 */
function AttachmentSizeIndicator({
  attachments,
}: {
  attachments: Attachment[];
}) {
  const sizeInfo = calculateAttachmentSizeInfo(attachments);

  return (
    <div className="text-xs text-muted-foreground space-y-1.5">
      <div className="flex items-center justify-between">
        <span>
          Attachments: {attachments.length} / {MAX_ATTACHMENTS_PER_EMAIL}
        </span>
        <span>
          {formatBytes(sizeInfo.totalRawSize)} raw → ~
          {formatBytes(sizeInfo.estimatedEncodedSize)} encoded
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div
          className={`h-2 rounded-full transition-all ${
            sizeInfo.usagePercent > 90
              ? "bg-red-500"
              : sizeInfo.usagePercent > 75
                ? "bg-yellow-500"
                : "bg-green-500"
          }`}
          style={{ width: `${Math.min(sizeInfo.usagePercent, 100)}%` }}
        />
      </div>

      {/* Percentage display */}
      <div className="text-[10px] mt-0.5 text-right">
        {sizeInfo.usagePercent.toFixed(1)}% of Gmail&apos;s 25 MB limit used
      </div>
    </div>
  );
}

/**
 * AttachmentList Component
 *
 * Displays uploaded attachments with:
 * - File icons based on MIME type
 * - Filename
 * - File size in human-readable format
 * - Inline toggle for image attachments
 * - Remove button for each attachment
 * - Size usage indicator with progress bar
 */
export function AttachmentList({ attachments, onRemove, onToggleInline }: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* List of attachments */}
      <div className="space-y-1.5">
        {attachments.map((attachment, index) => {
          const FileIcon = getFileIcon(attachment.contentType);
          const isImage = isImageAttachment(attachment);
          const isInline = attachment.isInline || false;

          return (
            <div
              key={`${attachment.filename}-${index}`}
              className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              {/* File icon */}
              <div className="flex-shrink-0">
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  {isInline && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      inline
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {attachment.size ? formatBytes(attachment.size) : "Unknown size"}
                </p>
              </div>

              {/* Inline toggle (only for images) */}
              {isImage && onToggleInline && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <label
                      htmlFor={`inline-toggle-${index}`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Inline in body
                    </label>
                    <Checkbox
                      id={`inline-toggle-${index}`}
                      checked={isInline}
                      onCheckedChange={(checked) =>
                        onToggleInline(index, checked === true)
                      }
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              )}

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Remove {attachment.filename}</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Size indicator */}
      <AttachmentSizeIndicator attachments={attachments} />
    </div>
  );
}
