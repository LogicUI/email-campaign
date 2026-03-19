import {
  getZodErrorMessage,
  regenerateProviderResponseSchema,
} from "@/zodSchemas/api";
import type { AiProviderParsedResponse } from "@/types/ai-provider";

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

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
