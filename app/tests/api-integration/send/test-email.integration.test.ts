import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/api/send/test/route";

import { resetTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import { createTestEmailRequest } from "@/tests/helpers/api";

// Mock error-handler first (before routes import it)
vi.mock("@/api/_lib/error-handler", () => ({
  withApiHandler: vi.fn((handler: unknown) => async (request: Request, context?: unknown) => {
    try {
      return await (handler as (request: Request, context?: unknown) => Promise<Response>)(request, context);
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: string }).code)
          : "INTERNAL_ERROR";

      return Response.json(
        {
          ok: false,
          code,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: statusCode },
      );
    }
  }),
}));

// Mock all required modules
vi.mock("@/api/_lib/api-auth", () => ({
  createAuthErrorResponse: vi.fn((code: string) =>
    Response.json(
      {
        ok: false,
        code,
        error: "auth",
      },
      { status: 401 },
    ),
  ),
  getAuthToken: vi.fn(),
  requireApiSession: vi.fn(),
}));

vi.mock("@/core/auth/google-access-token", () => ({
  ReauthRequiredError: class ReauthRequiredError extends Error {
    code = "REAUTH_REQUIRED" as const;
  },
  getValidGoogleAccessToken: vi.fn(),
}));

vi.mock("@/core/integrations/gmail-client", () => ({
  sendGmailMessage: vi.fn(),
}));

// Import mocked modules
const { requireApiSession } = await import("@/api/_lib/api-auth");
const { getValidGoogleAccessToken, ReauthRequiredError } = await import("@/core/auth/google-access-token");
const { sendGmailMessage } = await import("@/core/integrations/gmail-client");
const mockSendGmailMessage = vi.mocked(sendGmailMessage);

describe("POST /api/send/test - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("returns REAUTH_REQUIRED when Google token expires", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      vi.mocked(getValidGoogleAccessToken).mockRejectedValueOnce(new ReauthRequiredError());

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("REAUTH_REQUIRED");
    });
  });

  describe("Validation", () => {
    it("returns 400 when 'to' email is missing", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify({
          subject: "Test Subject",
          body: "Test Body",
        }),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(400);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when 'to' email is invalid", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify({
          to: "not-an-email",
          subject: "Test Subject",
          body: "Test Body",
        }),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when subject is missing", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          body: "Test Body",
        }),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when body is missing", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          subject: "Test Subject",
        }),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when all required fields are missing", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request as never, {} as never);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });
  });

  describe("Happy Path - Sending Test Email", () => {
    it("sends a test email successfully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_123" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            toEmail: "recipient@example.com",
            subject: "Test Subject",
            body: "Test Body",
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.providerMessageId).toBe("gmail_msg_123");
      expect(mockSendGmailMessage).toHaveBeenCalledTimes(1);

      // Verify sendGmailMessage was called with correct parameters
      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.toEmail).toBe("recipient@example.com");
      expect(callArgs.subject).toBe("Test Subject");
      expect(callArgs.bodyText).toBe("Test Body");
      expect(callArgs.fromEmail).toBe("sender@example.com");
    });

    it("sends test email with HTML rendering", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_456" });

      const bodyText = "Line 1\nLine 2\nLine 3";
      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            toEmail: "recipient@example.com",
            subject: "Test Subject",
            body: bodyText,
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.providerMessageId).toBe("gmail_msg_456");

      // Verify HTML rendering
      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.bodyText).toBe(bodyText);
      expect(callArgs.bodyHtml).toContain("<div");
      expect(callArgs.bodyHtml).toContain("<br />");
      expect(callArgs.bodyHtml).toContain("Line 1");
    });

    it("passes rich html and inline attachments through to Gmail", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_inline" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            toEmail: "recipient@example.com",
            subject: "Inline image",
            body: "Intro\n\n[Image]\n\nOutro",
            bodyHtml:
              '<p>Intro</p><p><img src="cid:img_demo_123" data-content-id="img_demo_123" /></p><p>Outro</p>',
            bodyText: "Intro\n\n[Image]\n\nOutro",
            attachments: [
              {
                filename: "demo.png",
                contentType: "image/png",
                data: "ZmFrZQ==",
                isInline: true,
                contentId: "img_demo_123",
              },
            ],
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const callArgs = mockSendGmailMessage.mock.calls[mockSendGmailMessage.mock.calls.length - 1][0];
      expect(callArgs.bodyHtml).toContain('cid:img_demo_123');
      expect(callArgs.attachments).toHaveLength(1);
      expect(callArgs.attachments?.[0]?.contentId).toBe("img_demo_123");
    });

    it("sends test email to different recipients", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const recipients = [
        "user1@example.com",
        "user2@example.com",
        "user3@test.com",
      ];

      for (const recipient of recipients) {
        mockAuthenticatedUser({ email: "sender@example.com" });
        mockSendGmailMessage.mockResolvedValueOnce({ id: `gmail_msg_${recipient}` });

        const request = new Request("http://localhost/api/send/test", {
          method: "POST",
          body: JSON.stringify(
            createTestEmailRequest({
              toEmail: recipient,
              subject: "Test",
              body: "Body",
            })
          ),
        });

        const response = await POST(request as never, {} as never);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.ok).toBe(true);

        const callArgs = mockSendGmailMessage.mock.calls[mockSendGmailMessage.mock.calls.length - 1][0];
        expect(callArgs.toEmail).toBe(recipient);
      }

      expect(mockSendGmailMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Scenarios", () => {
    it("handles Gmail API error gracefully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockRejectedValueOnce(new Error("Gmail service unavailable"));

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Gmail service unavailable");
    });

    it("handles network timeout gracefully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockRejectedValueOnce(new Error("Request timeout"));

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Request timeout");
    });

    it("handles rate limiting from Gmail API", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Rate limit exceeded");
    });

    it("handles unknown errors gracefully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockRejectedValueOnce("Unknown error string");

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(createTestEmailRequest()),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toBe("Unknown error string");
    });
  });

  describe("Edge Cases", () => {
    it("handles email with special characters in body", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_special" });

      const bodyWithSpecialChars = "Test body with <html> & \"quotes\" and 'apostrophes'";
      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            body: bodyWithSpecialChars,
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.bodyText).toBe(bodyWithSpecialChars);
    });

    it("handles email with very long subject", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_long" });

      const longSubject = "A".repeat(500);
      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            subject: longSubject,
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.subject).toBe(longSubject);
    });

    it("handles email with multiline body", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_multiline" });

      const multilineBody = "Dear User,\n\nThis is a test email.\n\nBest regards,\nThe Team";
      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            body: multilineBody,
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.bodyText).toBe(multilineBody);
    });

    it("handles email with unicode characters", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_unicode" });

      const request = new Request("http://localhost/api/send/test", {
        method: "POST",
        body: JSON.stringify(
          createTestEmailRequest({
            subject: "Test with émojis 🎉",
            body: "Body with 中文 and español",
          })
        ),
      });

      const response = await POST(request as never, {} as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const callArgs = mockSendGmailMessage.mock.calls[0][0];
      expect(callArgs.subject).toBe("Test with émojis 🎉");
      expect(callArgs.bodyText).toContain("中文");
    });
  });
});
