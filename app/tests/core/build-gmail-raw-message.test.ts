import { describe, expect, it } from "vitest";

import { buildGmailRawMessage } from "@/core/email/build-gmail-raw-message";
import type { Attachment } from "@/types/gmail";

describe("buildGmailRawMessage", () => {
  it("builds a Gmail-compatible MIME message without attachments", () => {
    const raw = buildGmailRawMessage({
      bodyHtml: "<p>Hello world</p>",
      bodyText: "Hello world",
      fromEmail: "sender@example.com",
      subject: "Hello there",
      toEmail: "recipient@example.com",
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    expect(decoded).toContain("From: sender@example.com");
    expect(decoded).toContain("Reply-To: sender@example.com");
    expect(decoded).toContain("To: recipient@example.com");
    expect(decoded).toContain("Subject: Hello there");
    expect(decoded).toContain("Content-Type: multipart/alternative;");
    expect(decoded).not.toContain("multipart/mixed");
    expect(decoded).toContain(Buffer.from("Hello world", "utf8").toString("base64"));
    expect(decoded).toContain(Buffer.from("<p>Hello world</p>", "utf8").toString("base64"));
  });

  it("builds a Gmail-compatible MIME message with a single attachment", () => {
    const attachment: Attachment = {
      filename: "test.pdf",
      contentType: "application/pdf",
      data: "dGVzdCBmaWxlIGNvbnRlbnQ=", // Pre-base64 encoded "test file content"
      size: 17,
    };

    const raw = buildGmailRawMessage({
      bodyHtml: "<p>Hello world</p>",
      bodyText: "Hello world",
      fromEmail: "sender@example.com",
      subject: "Hello there",
      toEmail: "recipient@example.com",
      attachments: [attachment],
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    expect(decoded).toContain("Content-Type: multipart/mixed;");
    expect(decoded).toContain('Content-Type: multipart/alternative;');
    expect(decoded).toContain("Content-Type: application/pdf");
    expect(decoded).toContain('Content-Disposition: attachment; filename="test.pdf"');
    expect(decoded).toContain("Content-Transfer-Encoding: base64");
    // Check that attachment data is present (encoded by encodeMimePart)
    expect(decoded).toMatch(/ZEdWemRDQm1hV3hsSUdOdmJuUmxiblE9/);
  });

  it("builds a Gmail-compatible MIME message with multiple attachments", () => {
    const attachments: Attachment[] = [
      {
        filename: "test.pdf",
        contentType: "application/pdf",
        data: Buffer.from("PDF content").toString("base64"),
        size: 11,
      },
      {
        filename: "image.png",
        contentType: "image/png",
        data: Buffer.from("PNG content").toString("base64"),
        size: 11,
      },
    ];

    const raw = buildGmailRawMessage({
      bodyHtml: "<p>Hello world</p>",
      bodyText: "Hello world",
      fromEmail: "sender@example.com",
      subject: "Hello there",
      toEmail: "recipient@example.com",
      attachments,
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    expect(decoded).toContain("Content-Type: multipart/mixed;");
    expect(decoded).toContain('Content-Disposition: attachment; filename="test.pdf"');
    expect(decoded).toContain('Content-Disposition: attachment; filename="image.png"');
    expect(decoded).toContain("Content-Type: application/pdf");
    expect(decoded).toContain("Content-Type: image/png");
  });

  it("maintains backward compatibility when no attachments are provided", () => {
    const raw = buildGmailRawMessage({
      bodyHtml: "<p>HTML body</p>",
      bodyText: "Text body",
      fromEmail: "test@example.com",
      subject: "Test subject",
      toEmail: "recipient@example.com",
      attachments: [],
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    // Should use multipart/alternative, not multipart/mixed
    expect(decoded).toContain("Content-Type: multipart/alternative;");
    expect(decoded).not.toContain("multipart/mixed");
  });

  it("properly encodes attachment data with base64", () => {
    const attachment: Attachment = {
      filename: "document.txt",
      contentType: "text/plain",
      data: "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IGRvY3VtZW50IQ==", // Pre-base64 encoded
    };

    const raw = buildGmailRawMessage({
      bodyHtml: "<p>Email body</p>",
      bodyText: "Email body",
      fromEmail: "sender@example.com",
      subject: "Test",
      toEmail: "recipient@example.com",
      attachments: [attachment],
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    // Check that attachment data is present and properly encoded
    expect(decoded).toMatch(/U0dWc2JHOHNJSFJvYVhNZ2FYTWdZU0IwWlhOMElHUnZZM1Z0Wlc1MElRPT0=/);
  });
});
