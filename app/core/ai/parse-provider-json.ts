import {
  getZodErrorMessage,
  regenerateProviderResponseSchema,
} from "@/zodSchemas/api";
import type { AiProviderParsedResponse } from "@/types/ai-provider";

/**
 * Removes surrounding markdown code fences from provider output before JSON parsing.
 *
 * Some model responses wrap JSON in markdown fences even when asked not to. This
 * helper strips that wrapper so the actual payload can still be validated.
 *
 * @param value Raw provider output.
 * @returns Normalized JSON string without surrounding fences.
 */
function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Parses and validates a JSON response produced by an AI provider.
 *
 * This exists for providers/endpoints that return structured JSON instead of direct
 * streaming text. The result is validated through Zod so malformed provider output
 * fails with a user-facing schema error instead of leaking runtime shape issues.
 *
 * @param content Raw provider response text.
 * @returns Normalized provider response object.
 */
export function parseProviderJsonResponse(content: string): AiProviderParsedResponse {
  const normalized = stripCodeFence(content);
  const parsed = regenerateProviderResponseSchema.safeParse(JSON.parse(normalized));

  if (!parsed.success) {
    throw new Error(getZodErrorMessage(parsed.error));
  }

  return {
    body: parsed.data.body.trim(),
    subject: parsed.data.subject?.trim() || undefined,
    reasoning: parsed.data.reasoning?.trim() || undefined,
  };
}
