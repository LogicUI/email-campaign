import { describe, expect, it } from "vitest";

import { buildGmailRawMessage } from "@/core/email/build-gmail-raw-message";

describe("buildGmailRawMessage", () => {
  it("builds a Gmail-compatible MIME message", () => {
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
    expect(decoded).toContain(Buffer.from("Hello world", "utf8").toString("base64"));
    expect(decoded).toContain(Buffer.from("<p>Hello world</p>", "utf8").toString("base64"));
  });
});
