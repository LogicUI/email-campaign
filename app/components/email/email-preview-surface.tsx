"use client";

import { useMemo, useState } from "react";
import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Mail,
  Paperclip,
} from "lucide-react";

import { formatAttachmentMeta } from "@/core/email/email-preview";
import { cn } from "@/core/utils/cn";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/gmail";

type PreviewMode = "exact" | "inbox";

interface EmailPreviewSurfaceProps {
  ccEmails?: string[];
  fileAttachments: Attachment[];
  fromEmail: string;
  inlineAttachmentsCount: number;
  previewHtml: string;
  subject: string;
  toEmail: string;
}

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

function AttachmentChips({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment, index) => {
        const FileIcon = getFileIcon(attachment.contentType);

        return (
          <div
            key={`${attachment.filename}-${index}`}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <FileIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {attachment.filename}
              </p>
              <p className="text-xs text-slate-500">
                {attachment.contentType} · {formatAttachmentMeta(attachment)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmailBody({
  previewHtml,
  className,
}: {
  previewHtml: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none rounded-2xl border border-border/60 bg-white px-5 py-4 shadow-inner",
        "[&_a]:text-sky-700 [&_a]:underline-offset-2 hover:[&_a]:text-sky-800",
        "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200",
        "[&_p]:leading-7 [&_strong]:font-semibold",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );
}

export function EmailPreviewSurface(props: EmailPreviewSurfaceProps) {
  const {
    ccEmails,
    fileAttachments,
    fromEmail,
    inlineAttachmentsCount,
    previewHtml,
    subject,
    toEmail,
  } = props;
  const [previewMode, setPreviewMode] = useState<PreviewMode>("exact");
  const summaryBadges = useMemo(
    () => [
      `To: ${toEmail || "recipient@example.com"}`,
      `From: ${fromEmail}`,
      ...(ccEmails && ccEmails.length > 0 ? [`Cc: ${ccEmails.join(", ")}`] : []),
      ...(inlineAttachmentsCount > 0
        ? [
            `${inlineAttachmentsCount} inline image${
              inlineAttachmentsCount === 1 ? "" : "s"
            } in body`,
          ]
        : []),
    ],
    [ccEmails, fromEmail, inlineAttachmentsCount, toEmail],
  );

  return (
    <div className="grid gap-4">
      <div className="inline-flex w-fit rounded-full border border-border/70 bg-muted/40 p-1">
        <Button
          type="button"
          size="sm"
          variant={previewMode === "exact" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setPreviewMode("exact")}
        >
          Exact send
        </Button>
        <Button
          type="button"
          size="sm"
          variant={previewMode === "inbox" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setPreviewMode("inbox")}
        >
          Inbox view
        </Button>
      </div>

      {previewMode === "exact" ? (
        <div className="rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,245,238,0.88))] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {summaryBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1"
              >
                {badge}
              </span>
            ))}
          </div>

          {fileAttachments.length > 0 ? (
            <div className="mb-4 grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Paperclip className="h-4 w-4" />
                Attachments included with send
              </div>
              <AttachmentChips attachments={fileAttachments} />
            </div>
          ) : null}

          <EmailBody previewHtml={previewHtml} />
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-slate-100/90 p-4">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">{subject || "(No subject)"}</p>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{fromEmail}</p>
                  <p className="truncate text-xs text-slate-500">to {toEmail || "recipient@example.com"}</p>
                  {ccEmails && ccEmails.length > 0 ? (
                    <p className="truncate text-xs text-slate-500">cc {ccEmails.join(", ")}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {fileAttachments.length > 0 ? (
              <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
                <AttachmentChips attachments={fileAttachments} />
              </div>
            ) : null}

            <div className="px-6 py-5">
              <EmailBody previewHtml={previewHtml} className="border-0 bg-transparent px-0 py-0 shadow-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
