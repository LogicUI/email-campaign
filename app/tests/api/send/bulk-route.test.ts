import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { POST } from "@/api/send/bulk/route";

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

const { getAuthToken, requireApiSession } = await import("@/api/_lib/api-auth");
const { getValidGoogleAccessToken } = await import("@/core/auth/google-access-token");
const { sendGmailMessage } = await import("@/core/integrations/gmail-client");

describe("POST /api/send/bulk", () => {
  it("returns 401 when no authenticated session exists", async () => {
    vi.mocked(requireApiSession).mockResolvedValueOnce({
      response: NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "auth",
        },
        { status: 401 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify({
          campaignId: "campaign_1",
          sendJobId: "sendjob_1",
          recipients: [
            {
              id: "recipient_1",
              email: "recipient@example.com",
              subject: "Hello",
              body: "Body",
            },
          ],
        }),
      }) as never,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNAUTHORIZED",
      ok: false,
    });
  });

  it("sends through Gmail for authenticated users", async () => {
    vi.mocked(requireApiSession).mockResolvedValueOnce({
      session: {
        user: {
          email: "sender@example.com",
        },
      },
    } as never);
    vi.mocked(getAuthToken).mockResolvedValueOnce({
      accessToken: "token_123",
    } as never);
    vi.mocked(getValidGoogleAccessToken).mockResolvedValueOnce("token_123");
    vi.mocked(sendGmailMessage).mockResolvedValueOnce({
      id: "gmail_message_1",
    });

    const response = await POST(
      new Request("http://localhost/api/send/bulk", {
        method: "POST",
        body: JSON.stringify({
          campaignId: "campaign_1",
          sendJobId: "sendjob_1",
          recipients: [
            {
              id: "recipient_1",
              email: "recipient@example.com",
              subject: "Hello",
              body: "Body",
            },
          ],
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toMatchObject({
      data: {
        results: [
          {
            providerMessageId: "gmail_message_1",
            recipientId: "recipient_1",
            status: "sent",
          },
        ],
        sendJobId: "sendjob_1",
      },
      ok: true,
    });
    expect(sendGmailMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "token_123",
        fromEmail: "sender@example.com",
        subject: "Hello",
        toEmail: "recipient@example.com",
      }),
    );
  });
});
