import { streamWithOpenAiCompatible } from "@/core/ai/providers/openai-compatible";
import type { AiStreamDraftParams } from "@/types/ai-provider";

/**
 * Runs regeneration against DeepSeek through the shared OpenAI-compatible adapter.
 *
 * @param params Provider request parameters plus streaming callbacks.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithDeepSeek(params: AiStreamDraftParams) {
  return streamWithOpenAiCompatible(params, {
    baseURL: "https://api.deepseek.com",
  });
}
