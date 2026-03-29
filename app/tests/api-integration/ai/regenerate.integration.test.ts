import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/api/ai/regenerate/route";

import { resetTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import { createRegenerateRequest } from "@/tests/helpers/api";

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
  requireApiSession: vi.fn(),
}));

vi.mock("@/core/ai/dispatch-regenerate", () => ({
  dispatchRegenerate: vi.fn(),
}));

// Import mocked modules
const { requireApiSession } = await import("@/api/_lib/api-auth");
const { dispatchRegenerate } = await import("@/core/ai/dispatch-regenerate");
const mockDispatchRegenerate = vi.mocked(dispatchRegenerate);

describe("POST /api/ai/regenerate - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 401 response with UNAUTHORIZED code", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    it("returns 400 when recipientId is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          recipient: { email: "test@example.com", fields: {} },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when provider is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_123",
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          apiKey: "sk-ant-test",
          recipient: { email: "test@example.com", fields: {} },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when apiKey is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_123",
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          recipient: { email: "test@example.com", fields: {} },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when globalBodyTemplate is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_123",
          globalSubject: "Test Subject",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          recipient: { email: "test@example.com", fields: {} },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when recipient object is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify({
          recipientId: "recipient_123",
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });
  });

  describe("Happy Path - REST AI Generation", () => {
    it("returns AI-generated email successfully", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const generatedBody = "This is the AI-generated email body.";

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Generated Subject",
        body: generatedBody,
        reasoning: "Regenerated based on recipient profile",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            recipientId: "recipient_123",
            provider: "anthropic",
            apiKey: "sk-ant-test",
            recipient: {
              email: "recipient@example.com",
              fields: { name: "John Doe" },
            },
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");
      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(json.data).toMatchObject({
        recipientId: "recipient_123",
        subject: "Generated Subject",
        body: generatedBody,
        reasoning: "Regenerated based on recipient profile",
      });
    });

    it("returns generated email body without streaming deltas", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });
      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Test Subject",
        body: "Hello {{name}}, this is a test.",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.data).toMatchObject({
        subject: "Test Subject",
        body: "Hello {{name}}, this is a test.",
      });
    });

    it("includes reasoning in final event when provided by AI", async () => {
      mockAuthenticatedUser({ email: "sender@example.com" });

      const reasoningText = "Regenerated to be more professional";

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Professional Subject",
        body: "Professional email body",
        reasoning: reasoningText,
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest({ mode: "improve" })),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.data?.reasoning).toBe(reasoningText);
    });
  });

  describe("Multiple AI Providers", () => {
    it("works with Anthropic provider", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Anthropic Generated",
        body: "Body from Anthropic",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            provider: "anthropic",
            apiKey: "sk-ant-test",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDispatchRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "anthropic",
          apiKey: "sk-ant-test",
        })
      );
    });

    it("works with OpenAI provider", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "OpenAI Generated",
        body: "Body from OpenAI",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            provider: "openai",
            apiKey: "sk-openai-test",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDispatchRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai",
          apiKey: "sk-openai-test",
        })
      );
    });

    it("works with Google provider", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Google Generated",
        body: "Body from Google",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            provider: "google",
            apiKey: "google-api-key",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDispatchRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          apiKey: "google-api-key",
        })
      );
    });

    it("works with DeepSeek provider", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "DeepSeek Generated",
        body: "Body from DeepSeek",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            provider: "deepseek",
            apiKey: "deepseek-key",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDispatchRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "deepseek",
          apiKey: "deepseek-key",
        })
      );
    });
  });

  describe("Error Scenarios", () => {
    it("handles AI provider errors gracefully", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("AI service unavailable"));

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("AI service unavailable");
    });

    it("handles API key errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Invalid API key"));

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Invalid API key");
    });

    it("handles rate limiting errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Rate limit exceeded");
    });

    it("handles timeout errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Request timeout"));

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Request timeout");
    });
  });

  describe("Custom Prompts", () => {
    it("includes custom prompt when provided", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Custom Prompt Subject",
        body: "Body with custom prompt applied",
      });

      const customPrompt = "Make this email more formal and professional";

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            prompt: customPrompt,
            mode: "improve",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify custom prompt was passed
      expect(mockDispatchRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(customPrompt),
        })
      );
    });

    it("works with different modes", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Refreshed Subject",
        body: "Refreshed body",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            mode: "refresh",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDispatchRegenerate).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty current body", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Generated from empty",
        body: "New email body",
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(
          createRegenerateRequest({
            currentBody: "",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("handles special characters in generated body", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const specialBody = "Email with quotes: 'test' and \"double\" and emoji 🎉";

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Special Characters",
        body: specialBody,
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data?.body).toContain("quotes");
    });

    it("handles very long generated body", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const longBody = "A".repeat(10000);

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Long Email",
        body: longBody,
      });

      const request = new Request("http://localhost/api/ai/regenerate", {
        method: "POST",
        body: JSON.stringify(createRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data?.body).toContain(longBody.substring(0, 100));
    });
  });
});
