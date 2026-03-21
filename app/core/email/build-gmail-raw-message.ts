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
 * @param params Message sender, recipient, subject, and body variants.
 * @returns Base64url-encoded raw Gmail message payload.
 */
export function buildGmailRawMessage(params: BuildGmailRawMessageParams) {
  const boundary = `emailai_${randomUUID().replaceAll("-", "")}`;
  const message = [
    `From: ${sanitizeHeaderValue(params.fromEmail)}`,
    `Reply-To: ${sanitizeHeaderValue(params.fromEmail)}`,
    `To: ${sanitizeHeaderValue(params.toEmail)}`,
    `Subject: ${encodeHeaderValue(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeMimePart(params.bodyText),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeMimePart(params.bodyHtml),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}
