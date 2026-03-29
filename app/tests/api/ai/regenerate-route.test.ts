import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { POST } from "@/api/ai/regenerate/route";
import { DEFAULT_REGENERATE_PROMPT } from "@/core/ai/regenerate-guardrails";

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
      new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("falls back to the default prompt when the request omits prompt", async () => {
    vi.mocked(requireApiSession).mockResolvedValueOnce({
      session: {
        user: {
          email: "sender@example.com",
        },
      },
    } as never);
    vi.mocked(dispatchRegenerate).mockResolvedValueOnce({
      body: "Refined body",
      reasoning: "Tightened the opener.",
      subject: "Refined subject",
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

    expect(response.headers.get("content-type")).toContain("application/json");
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(json.data).toMatchObject({
      recipientId: "recipient_1",
      subject: "Refined subject",
      body: "Refined body",
      reasoning: "Tightened the opener.",
    });
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "anthropic",
        apiKey: "sk-ant-test",
        model: "claude-3-5-sonnet-latest",
        prompt: expect.stringContaining(DEFAULT_REGENERATE_PROMPT),
      }),
    );
  });

  it("uses the explicit prompt when one is provided", async () => {
    const customPrompt = "Make it warmer and reference the clinic location directly.";

    vi.mocked(requireApiSession).mockResolvedValueOnce({
      session: {
        user: {
          email: "sender@example.com",
        },
      },
    } as never);
    vi.mocked(dispatchRegenerate).mockResolvedValueOnce({
      body: "Custom prompt body",
      reasoning: "Adjusted tone",
      subject: "Custom prompt subject",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_1",
          globalSubject: "Original subject",
          globalBodyTemplate: "Original body",
          currentBody: "Current body",
          prompt: customPrompt,
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

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(`User regeneration prompt: ${customPrompt}`),
      }),
    );
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        prompt: expect.stringContaining(DEFAULT_REGENERATE_PROMPT),
      }),
    );
  });
});
