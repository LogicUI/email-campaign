import { randomUUID } from "node:crypto";
import { generateContentId, isImageAttachment } from "./attachment-utils";
import { replaceImagePlaceholders } from "./replace-image-placeholders";
import { extractHtmlForEmail } from "./extract-html-for-email";
import type { BuildGmailRawMessageParams } from "@/types/gmail";

/**
 * Removes line breaks from header values before inserting them into MIME headers.
 *
 * This exists to prevent malformed headers and simple header-injection issues when
 * values originate from editable campaign content.
 *
 * @param value Raw header value.
 * @returns Sanitized single-line header value.
 */
function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Encodes non-ASCII header values using the RFC 2047 encoded-word format.
 *
 * Gmail expects MIME-safe header values, so subjects containing non-ASCII text need
 * to be encoded while plain ASCII headers can remain untouched.
 *
 * @param value Raw header value.
 * @returns Header-safe string ready for insertion into the MIME message.
 */
function encodeHeaderValue(value: string) {
  const sanitized = sanitizeHeaderValue(value);

  return /^[\x20-\x7E]*$/.test(sanitized)
    ? sanitized
    : `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

/**
 * Encodes a MIME body part into wrapped base64.
 *
 * @param value UTF-8 message body content.
 * @returns Base64 text wrapped to MIME-friendly line lengths.
 */
function encodeMimePart(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/**
 * Wraps pre-base64-encoded data for MIME.
 *
 * This is used for attachment data that is already base64-encoded.
 * We only add line wrapping without re-encoding.
 *
 * @param base64Data Pre-base64-encoded data (e.g., from file uploads).
 * @returns Base64 text wrapped to MIME-friendly line lengths.
 */
function wrapBase64Data(base64Data: string) {
  return base64Data.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/**
 * Builds the raw RFC 2822 message payload Gmail expects for the send API.
 *
 * This centralizes MIME construction so send routes can consistently generate both
 * text and HTML variants of the email body without duplicating low-level encoding.
 *
 * Supports:
 * - Regular file attachments
 * - Inline images (embedded in HTML body using Content-ID)
 * - Mixed emails with both inline images and file attachments
 *
 * @param params Message sender, recipient, subject, body variants, and optional attachments.
 * @returns Base64url-encoded raw Gmail message payload.
 */
export async function buildGmailRawMessage(params: BuildGmailRawMessageParams) {
  const hasAttachments = params.attachments && params.attachments.length > 0;

  // Separate inline images from file attachments
  const inlineImages = hasAttachments
    ? params.attachments!.filter((att) => att.isInline && isImageAttachment(att))
    : [];
  const fileAttachments = hasAttachments
    ? params.attachments!.filter((att) => !att.isInline)
    : [];

  // Ensure inline images have contentIds
  await Promise.all(
    inlineImages.map(async (img) => {
      if (!img.contentId) {
        img.contentId = await generateContentId(img.filename);
      }
    })
  );

  // Extract HTML from TipTap JSON if available, convert placeholders back to {{field_name}}
  const finalHtml = extractHtmlForEmail(
    params.editorJson,
    params.bodyHtml,
    inlineImages
  );

  // Replace {{image:filename}} placeholders with cid: references
  const { html: processedBodyHtml } = await replaceImagePlaceholders(
    finalHtml,
    inlineImages
  );

  const outerBoundary = `emailai_outer_${randomUUID().replaceAll("-", "")}`;
  const innerBoundary = `emailai_inner_${randomUUID().replaceAll("-", "")}`;
  const relatedBoundary = inlineImages.length > 0
    ? `emailai_related_${randomUUID().replaceAll("-", "")}`
    : null;

  // Build headers array - only add CC header if there are CC recipients
  // This prevents an empty string from creating an extra blank line in the headers
  const headers = [
    `From: ${sanitizeHeaderValue(params.fromEmail)}`,
    `Reply-To: ${sanitizeHeaderValue(params.fromEmail)}`,
    `To: ${sanitizeHeaderValue(params.toEmail)}`,
  ];

  // Only add CC header if there are actual CC recipients
  if (params.ccEmails && params.ccEmails.length > 0) {
    headers.push(`Cc: ${sanitizeHeaderValue(params.ccEmails.join(", "))}`);
  }

  headers.push(
    `Subject: ${encodeHeaderValue(params.subject)}`,
    "MIME-Version: 1.0"
  );

  const messageParts: string[] = [];

  const hasInlineImages = inlineImages.length > 0;
  const hasFileAttachments = fileAttachments.length > 0;
  const hasAnyAttachments = hasInlineImages || hasFileAttachments;

  if (hasAnyAttachments) {
    // Use multipart/mixed for messages with attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${outerBoundary}"`);

    // Start with the body part
    if (hasInlineImages) {
      // Use multipart/related for inline images
      messageParts.push(
        "",
        `--${outerBoundary}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
        "",
        `--${relatedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${innerBoundary}"`,
        "",
        `--${innerBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMimePart(params.bodyText),
        "",
        `--${innerBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMimePart(processedBodyHtml),
        "",
        `--${innerBoundary}--`,
        ""
      );

      // Add inline images
      for (const image of inlineImages) {
        messageParts.push(
          `--${relatedBoundary}`,
          `Content-Type: ${image.contentType}`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: inline; filename="${sanitizeHeaderValue(image.filename)}"`,
          `Content-ID: <${image.contentId}>`,
          "",
          wrapBase64Data(image.data),
          ""
        );
      }

      messageParts.push(`--${relatedBoundary}--`, "");
    } else {
      // No inline images, use multipart/alternative directly
      messageParts.push(
        "",
        `--${outerBoundary}`,
        `Content-Type: multipart/alternative; boundary="${innerBoundary}"`,
        "",
        `--${innerBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMimePart(params.bodyText),
        "",
        `--${innerBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMimePart(params.bodyHtml),
        "",
        `--${innerBoundary}--`,
        ""
      );
    }

    // Add file attachments
    for (const attachment of fileAttachments) {
      messageParts.push(
        `--${outerBoundary}`,
        `Content-Type: ${attachment.contentType}`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${sanitizeHeaderValue(attachment.filename)}"`,
        "",
        wrapBase64Data(attachment.data),
        ""
      );
    }

    messageParts.push(`--${outerBoundary}--`, "");
  } else {
    // Use multipart/alternative for messages without attachments (original behavior)
    headers.push(`Content-Type: multipart/alternative; boundary="${innerBoundary}"`);

    messageParts.push(
      "",
      `--${innerBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeMimePart(params.bodyText),
      "",
      `--${innerBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeMimePart(params.bodyHtml),
      "",
      `--${innerBoundary}--`,
      ""
    );
  }

  const message = [...headers, ...messageParts]
    .join("\r\n");

  const encoded = Buffer.from(message, "utf8").toString("base64url");

  // DEBUG: Log first 500 chars of the encoded message
  console.log('=== Gmail Raw Message (first 500 chars) ===');
  console.log(encoded.substring(0, 500));
  console.log('=== Original MIME (first 500 chars) ===');
  console.log(message.substring(0, 500));

  return encoded;
}
