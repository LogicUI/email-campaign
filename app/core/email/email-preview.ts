import { mergeTemplate } from "@/core/campaign/merge-template";
import { formatBytes, isImageAttachment } from "@/core/email/attachment-utils";
import {
  buildEmailPreviewHtml,
  serializeEmailEditorHtml,
} from "@/core/email/editor-content";
import { migrateLegacyContent } from "@/core/email/migrate-legacy-content";
import { isHtmlContent, renderTextFromHtml } from "@/core/email/render-email";
import type { PrimitiveFieldValue } from "@/types/campaign";
import type { Attachment } from "@/types/gmail";

export interface EmailPreviewModel {
  bodyHtml: string;
  bodyText: string;
  previewHtml: string;
  inlineAttachments: Attachment[];
  fileAttachments: Attachment[];
}

export interface TemplatedEmailPreviewModel extends EmailPreviewModel {
  subject: string;
  body: string;
}

function splitEmailAttachments(attachments: Attachment[]) {
  const inlineAttachments = attachments.filter(
    (attachment) => attachment.isInline && isImageAttachment(attachment),
  );
  const fileAttachments = attachments.filter(
    (attachment) => !(attachment.isInline && isImageAttachment(attachment)),
  );

  return {
    inlineAttachments,
    fileAttachments,
  };
}

function buildEmailSendHtml(content: string, attachments: Attachment[]) {
  return isHtmlContent(content)
    ? serializeEmailEditorHtml(content)
    : migrateLegacyContent(content, attachments);
}

export function buildEmailPreviewModel(
  content: string,
  attachments: Attachment[],
): EmailPreviewModel {
  const bodyHtml = buildEmailSendHtml(content, attachments);
  const bodyText = renderTextFromHtml(bodyHtml);
  const previewHtml = buildEmailPreviewHtml(content, attachments);
  const { fileAttachments, inlineAttachments } = splitEmailAttachments(attachments);

  return {
    bodyHtml,
    bodyText,
    previewHtml,
    inlineAttachments,
    fileAttachments,
  };
}

export function buildTemplatedEmailPreviewModel(params: {
  subject: string;
  body: string;
  attachments: Attachment[];
  fields?: Record<string, PrimitiveFieldValue>;
}): TemplatedEmailPreviewModel {
  const { attachments, body, fields, subject } = params;
  const resolvedBody = fields ? mergeTemplate(body, fields) : body;
  const resolvedSubject = fields ? mergeTemplate(subject, fields) : subject;
  const preview = buildEmailPreviewModel(resolvedBody, attachments);

  return {
    subject: resolvedSubject,
    body: resolvedBody,
    ...preview,
  };
}

export function formatAttachmentMeta(attachment: Attachment) {
  return attachment.size ? formatBytes(attachment.size) : "Unknown size";
}
