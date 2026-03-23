import { randomUUID } from "node:crypto";
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
 * Builds the raw RFC 2822 message payload Gmail expects for the send API.
 *
 * This centralizes MIME construction so send routes can consistently generate both
 * text and HTML variants of the email body without duplicating low-level encoding.
 *
 * Supports attachments by using multipart/mixed structure when attachments are present.
 *
 * @param params Message sender, recipient, subject, body variants, and optional attachments.
 * @returns Base64url-encoded raw Gmail message payload.
 */
export function buildGmailRawMessage(params: BuildGmailRawMessageParams) {
  const hasAttachments = params.attachments && params.attachments.length > 0;

  const outerBoundary = `emailai_outer_${randomUUID().replaceAll("-", "")}`;
  const innerBoundary = `emailai_inner_${randomUUID().replaceAll("-", "")}`;

  const ccHeader =
    params.ccEmails && params.ccEmails.length > 0
      ? `Cc: ${sanitizeHeaderValue(params.ccEmails.join(", "))}`
      : "";

  const headers = [
    `From: ${sanitizeHeaderValue(params.fromEmail)}`,
    `Reply-To: ${sanitizeHeaderValue(params.fromEmail)}`,
    `To: ${sanitizeHeaderValue(params.toEmail)}`,
    ccHeader,
    `Subject: ${encodeHeaderValue(params.subject)}`,
    "MIME-Version: 1.0",
  ];

  const messageParts: string[] = [];

  if (hasAttachments) {
    // Use multipart/mixed for messages with attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${outerBoundary}"`);

    // Add the body as multipart/alternative
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

    // Add each attachment
    for (const attachment of params.attachments) {
      messageParts.push(
        `--${outerBoundary}`,
        `Content-Type: ${attachment.contentType}`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${sanitizeHeaderValue(attachment.filename)}"`,
        "",
        encodeMimePart(attachment.data),
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
    .filter((line) => line !== "")
    .join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}
