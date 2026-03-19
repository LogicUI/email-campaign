import { randomUUID } from "node:crypto";
import type { BuildGmailRawMessageParams } from "@/types/gmail";

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeaderValue(value: string) {
  const sanitized = sanitizeHeaderValue(value);

  return /^[\x20-\x7E]*$/.test(sanitized)
    ? sanitized
    : `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

function encodeMimePart(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

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
