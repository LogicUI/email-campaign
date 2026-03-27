import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/api/ai/regenerate-global-template/route";

import { resetTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import { createGlobalTemplateRegenerateRequest } from "@/tests/helpers/api";

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

describe("POST /api/ai/regenerate-global-template - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    it("returns 400 when globalSubject is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          availablePlaceholders: ["name"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when globalBodyTemplate is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Test Subject",
          provider: "anthropic",
          apiKey: "sk-ant-test",
          availablePlaceholders: ["name"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when provider is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          apiKey: "sk-ant-test",
          availablePlaceholders: ["name"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when apiKey is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          availablePlaceholders: ["name"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("accepts request when availablePlaceholders is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });
      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Test Subject",
        body: "Test Body",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify({
          globalSubject: "Test Subject",
          globalBodyTemplate: "Test Body",
          provider: "anthropic",
          apiKey: "sk-ant-test",
        }),
      });

      const response = await POST(request);
      const streamText = await response.text();
      const events = streamText
        .split("\n\n")
        .filter((line) => line.trim().length > 0)
        .map((event) => {
          const match = event.match(/data: (.+)/);
          return match ? JSON.parse(match[1]) : null;
        })
        .filter((e) => e !== null);

      expect(response.status).toBe(200);
      expect(events[events.length - 1].type).toBe("done");
    });

    it("accepts request with detectedRecipientPlaceholder optional", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Regenerated Subject",
        body: "Regenerated body with {{name}}",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            detectedRecipientPlaceholder: undefined,
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Happy Path - Regenerating Global Template", () => {
    it("regenerates global template successfully", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const regeneratedBody = "Hello {{name}}, this is an improved template.";

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Improved Subject Line",
        body: regeneratedBody,
        reasoning: "Made the template more engaging",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            globalSubject: "Original Subject",
            globalBodyTemplate: "Original body with {{name}}",
            availablePlaceholders: ["name", "company"],
          })
        ),
      });

      const response = await POST(request);
      const streamText = await response.text();
      const events = streamText
        .split("\n\n")
        .filter((line) => line.trim().length > 0)
        .map((event) => {
          const match = event.match(/data: (.+)/);
          return match ? JSON.parse(match[1]) : null;
        })
        .filter((e) => e !== null);

      expect(response.status).toBe(200);
      const finalEvent = events[events.length - 1];
      expect(finalEvent.type).toBe("done");
      expect(finalEvent.data.body).toBe(regeneratedBody);
    });

    it("uses original subject when AI does not return one", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        body: "Regenerated body only",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            globalSubject: "Original Subject",
            globalBodyTemplate: "Original body",
            availablePlaceholders: ["name"],
          })
        ),
      });

      const response = await POST(request);
      const streamText = await response.text();
      const events = streamText
        .split("\n\n")
        .filter((line) => line.trim().length > 0)
        .map((event) => {
          const match = event.match(/data: (.+)/);
          return match ? JSON.parse(match[1]) : null;
        })
        .filter((e) => e !== null);

      expect(response.status).toBe(200);
      const finalEvent = events[events.length - 1];
      expect(finalEvent.type).toBe("done");
      expect(finalEvent.data.body).toBe("Regenerated body only");
    });

    it("includes placeholders in the prompt", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Template with Placeholders",
        body: "Hello {{name}} from {{company}}",
      });

      const placeholders = ["name", "company", "title"];

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            availablePlaceholders: placeholders,
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify placeholders were included in the prompt
      const callArgs = mockDispatchRegenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain("name");
      expect(callArgs.prompt).toContain("company");
      expect(callArgs.prompt).toContain("title");
    });

    it("handles custom prompt when provided", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Custom Prompt Result",
        body: "Body based on custom prompt",
      });

      const customPrompt = "Make this template more professional and formal";

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            prompt: customPrompt,
            mode: "improve",
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify custom prompt was passed
      const callArgs = mockDispatchRegenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain(customPrompt);
    });
  });

  describe("Multiple AI Providers", () => {
    it("works with Anthropic provider", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Anthropic Template",
        body: "Template from Anthropic",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
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
        subject: "OpenAI Template",
        body: "Template from OpenAI",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
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
        subject: "Google Template",
        body: "Template from Google",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
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
        subject: "DeepSeek Template",
        body: "Template from DeepSeek",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
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

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);
      const streamText = await response.text();

      expect(response.status).toBe(200);
      expect(streamText).toContain("event: error");
      expect(streamText).toContain("AI service unavailable");
    });

    it("handles API key errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Invalid API key"));

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);
      const streamText = await response.text();

      expect(response.status).toBe(200);
      expect(streamText).toContain("event: error");
      expect(streamText).toContain("Invalid API key");
    });

    it("handles rate limiting errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);
      const streamText = await response.text();

      expect(response.status).toBe(200);
      expect(streamText).toContain("event: error");
      expect(streamText).toContain("Rate limit exceeded");
    });

    it("handles timeout errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce(new Error("Request timeout"));

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);
      const streamText = await response.text();

      expect(response.status).toBe(200);
      expect(streamText).toContain("event: error");
      expect(streamText).toContain("Request timeout");
    });

    it("handles unknown errors", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockRejectedValueOnce("Unknown error string");

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(createGlobalTemplateRegenerateRequest()),
      });

      const response = await POST(request);
      const streamText = await response.text();

      expect(response.status).toBe(200);
      expect(streamText).toContain("event: error");
      expect(streamText).toContain("Regeneration failed");
    });
  });

  describe("Edge Cases", () => {
    it("handles template with no placeholders", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Simple Template",
        body: "This is a simple template with no placeholders",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            availablePlaceholders: [],
          })
        ),
      });

      const response = await POST(request);
      const streamText = await response.text();
      const events = streamText
        .split("\n\n")
        .filter((line) => line.trim().length > 0)
        .map((event) => {
          const match = event.match(/data: (.+)/);
          return match ? JSON.parse(match[1]) : null;
        })
        .filter((e) => e !== null);

      expect(response.status).toBe(200);
      expect(events[events.length - 1].type).toBe("done");
    });

    it("handles template with many placeholders", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Complex Template",
        body: "Template with {{name}}, {{company}}, {{title}}, {{city}}, {{country}}",
      });

      const manyPlaceholders = ["name", "company", "title", "city", "country", "phone", "email", "website"];

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            availablePlaceholders: manyPlaceholders,
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("handles template with special characters in placeholders", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Special Placeholders",
        body: "Template with {{first_name}} and {{last_name}}",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            availablePlaceholders: ["first_name", "last_name"],
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const callArgs = mockDispatchRegenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain("first_name");
      expect(callArgs.prompt).toContain("last_name");
    });

    it("handles very long template", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const longBody = "A".repeat(5000);

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Long Template",
        body: "Regenerated " + longBody,
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            globalBodyTemplate: longBody,
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("handles detectedRecipientPlaceholder parameter", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      mockDispatchRegenerate.mockResolvedValueOnce({
        subject: "Template",
        body: "Hello {{name}}",
      });

      const request = new Request("http://localhost/api/ai/regenerate-global-template", {
        method: "POST",
        body: JSON.stringify(
          createGlobalTemplateRegenerateRequest({
            detectedRecipientPlaceholder: "name",
            availablePlaceholders: ["name", "company"],
          })
        ),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const callArgs = mockDispatchRegenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain("name");
    });
  });
});
