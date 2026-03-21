import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { POST } from "@/api/ai/regenerate-global-template/route";
import { DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT } from "@/core/ai/regenerate-guardrails";

vi.mock("@/api/_lib/api-auth", () => ({
  requireApiSession: vi.fn(),
}));

vi.mock("@/core/ai/dispatch-regenerate", () => ({
  dispatchRegenerate: vi.fn(),
}));

const { requireApiSession } = await import("@/api/_lib/api-auth");
const { dispatchRegenerate } = await import("@/core/ai/dispatch-regenerate");

describe("POST /api/ai/regenerate-global-template", () => {
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
      new Request("http://localhost/api/ai/regenerate-global-template", {
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
      body: "Hi {{clinic_name}},\n\nHere is a refreshed template body.",
      reasoning: "Tightened the body.",
      subject: "Fresh intro for {{clinic_name}}",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Original subject",
          globalBodyTemplate: "Original body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          model: "claude-3-5-sonnet-latest",
          availablePlaceholders: ["clinic_name", "address"],
          detectedRecipientPlaceholder: "clinic_name",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        subject: "Fresh intro for {{clinic_name}}",
        body: "Hi {{clinic_name}},\n\nHere is a refreshed template body.",
      },
    });
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT),
      }),
    );
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Available placeholders: clinic_name, address"),
      }),
    );
  });

  it("uses the explicit prompt when one is provided", async () => {
    const customPrompt = "Make the opener warmer and more consultative.";

    vi.mocked(requireApiSession).mockResolvedValueOnce({
      session: {
        user: {
          email: "sender@example.com",
        },
      },
    } as never);
    vi.mocked(dispatchRegenerate).mockResolvedValueOnce({
      body: "Updated body",
      reasoning: "Adjusted tone",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Original subject",
          globalBodyTemplate: "Original body",
          prompt: customPrompt,
          provider: "anthropic",
          apiKey: "sk-ant-test",
          model: "claude-3-5-sonnet-latest",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(dispatchRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(`User regeneration prompt: ${customPrompt}`),
      }),
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        subject: "Original subject",
        body: "Updated body",
      },
    });
  });
});
