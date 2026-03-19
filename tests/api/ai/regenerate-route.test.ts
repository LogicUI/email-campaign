import { describe, expect, it, vi } from "vitest";

import { POST } from "@/api/ai/regenerate/route";

vi.mock("@/api/_lib/api-auth", () => ({
  requireApiSession: vi.fn(),
}));

vi.mock("@/core/ai/dispatch-regenerate", () => ({
  dispatchRegenerate: vi.fn(),
}));

const { requireApiSession } = await import("@/api/_lib/api-auth");
const { dispatchRegenerate } = await import("@/core/ai/dispatch-regenerate");

describe("POST /api/ai/regenerate", () => {
  it("returns unauthorized when no session exists", async () => {
    vi.mocked(requireApiSession).mockResolvedValueOnce({
      response: Response.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "auth",
        },
        { status: 401 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("dispatches regenerate with the selected provider config", async () => {
    vi.mocked(requireApiSession).mockResolvedValueOnce({
      session: {
        user: {
          email: "sender@example.com",
        },
      },
    } as never);
    vi.mocked(dispatchRegenerate).mockImplementationOnce(async (params) => {
      await params.onBodyDelta("Refined ");
      await params.onBodyDelta("body");
      return {
        body: "Refined body",
        reasoning: "Tightened the opener.",
        subject: "Refined subject",
      };
    });

    const response = await POST(
      new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_1",
          globalSubject: "Original subject",
          globalBodyTemplate: "Original body",
          currentBody: "Current body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          model: "claude-3-5-sonnet-latest",
          recipient: {
            email: "recipient@example.com",
            fields: {
              clinic_name: "North Clinic",
            },
          },
          mode: "refresh",
        }),
      }),
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const content = await response.text();

    expect(content).toContain('"type":"start"');
    expect(content).toContain('"type":"body_delta"');
    expect(content).toContain('"chunk":"Refined "');
    expect(content).toContain('"type":"final"');
    expect(content).toContain('"subject":"Refined subject"');
    expect(content).toContain('"body":"Refined body"');
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "anthropic",
        apiKey: "sk-ant-test",
        model: "claude-3-5-sonnet-latest",
        onBodyDelta: expect.any(Function),
      }),
    );
  });
});
