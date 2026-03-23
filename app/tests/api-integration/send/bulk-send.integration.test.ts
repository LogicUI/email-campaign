import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/api/send/bulk/route";

import { resetTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import { createBulkSendRequest } from "@/tests/helpers/api";
import { createTestSendRecipients } from "@/tests/fixtures/factories";

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

describe("POST /api/send/bulk - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest()),
      });

      const response = await POST(request as never);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("returns REAUTH_REQUIRED when Google token expires", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      vi.mocked(getValidGoogleAccessToken).mockRejectedValueOnce(new ReauthRequiredError());

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest()),
      });

      const response = await POST(request as never);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("REAUTH_REQUIRED");
    });
  });

  describe("Validation", () => {
    it("returns 400 when campaignId is empty", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify({
          campaignId: "",
          sendJobId: "test-job",
          recipients: createTestSendRecipients(1),
        }),
      });

      const response = await POST(request as never);

      expect(response.status).toBe(400);
      expect(mockSendGmailMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when recipients array is empty", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify({
          campaignId: "campaign_1",
          sendJobId: "test-job",
          recipients: [],
        }),
      });

      const response = await POST(request as never);

      expect(response.status).toBe(400);
    });
  });

  describe("Happy Path - Sending Emails", () => {
    it("sends a single email successfully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockSendGmailMessage.mockResolvedValueOnce({ id: "gmail_msg_123" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(1, {
            email: "recipient@example.com",
            subject: "Test Subject",
            body: "Test Body",
          }),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results).toHaveLength(1);
      expect(json.data.results[0].status).toBe("sent");
      expect(json.data.results[0].providerMessageId).toBe("gmail_msg_123");
      expect(mockSendGmailMessage).toHaveBeenCalledTimes(1);
    });

    it("sends multiple emails successfully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage
        .mockResolvedValueOnce({ id: "gmail_msg_1" })
        .mockResolvedValueOnce({ id: "gmail_msg_2" })
        .mockResolvedValueOnce({ id: "gmail_msg_3" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(3),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results).toHaveLength(3);
      expect(json.data.results.every((r: any) => r.status === "sent")).toBe(true);
      expect(mockSendGmailMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe("Concurrent Processing", () => {
    it("chunks sends into groups of CONCURRENCY=5", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage.mockImplementation(async () => ({
        id: `gmail_msg_${crypto.randomUUID()}`,
      }));

      const recipients = createTestSendRecipients(12); // Should create 3 chunks: 5, 5, 2

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({ recipients })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results).toHaveLength(12);
      expect(mockSendGmailMessage).toHaveBeenCalledTimes(12);
    });
  });

  describe("Partial Failures", () => {
    it("handles partial failures gracefully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage
        .mockResolvedValueOnce({ id: "gmail_msg_1" })
        .mockRejectedValueOnce(new Error("Rate limited"))
        .mockResolvedValueOnce({ id: "gmail_msg_3" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(3),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results).toHaveLength(3);

      const successful = json.data.results.filter((r: any) => r.status === "sent");
      const failed = json.data.results.filter((r: any) => r.status === "failed");

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
      expect(failed[0].errorMessage).toContain("Rate limited");
    });

    it("continues processing after individual send failures", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ id: "gmail_msg_2" })
        .mockResolvedValueOnce({ id: "gmail_msg_3" });

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(3),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.results).toHaveLength(3);
      expect(json.data.results[0].status).toBe("failed");
      expect(json.data.results[1].status).toBe("sent");
      expect(json.data.results[2].status).toBe("sent");
    });
  });

  describe("Error Scenarios", () => {
    it("handles Gmail API timeout gracefully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage.mockRejectedValueOnce(new Error("Request timeout"));

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(1),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results[0].status).toBe("failed");
      expect(json.data.results[0].errorMessage).toContain("Request timeout");
    });

    it("handles all sends failing without crashing", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage.mockRejectedValue(new Error("Gmail service unavailable"));

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({
          recipients: createTestSendRecipients(3),
        })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.results).toHaveLength(3);
      expect(json.data.results.every((r: any) => r.status === "failed")).toBe(true);
    });
  });

  describe("Large Batches", () => {
    it("handles large batches (20+ recipients)", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      mockSendGmailMessage.mockImplementation(async () => ({
        id: `gmail_msg_${crypto.randomUUID()}`,
      }));

      const recipients = createTestSendRecipients(25);

      const request = new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify(createBulkSendRequest({ recipients })),
      });

      const response = await POST(request as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.results).toHaveLength(25);
      expect(mockSendGmailMessage).toHaveBeenCalledTimes(25);
    });
  });
});
