import { streamWithOpenAiCompatible } from "@/core/ai/providers/openai-compatible";
import type { AiStreamDraftParams } from "@/types/ai-provider";

/**
 * Runs regeneration against OpenAI through the shared OpenAI-compatible adapter.
 *
 * @param params Provider request parameters plus streaming callbacks.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithOpenAi(params: AiStreamDraftParams) {
  return streamWithOpenAiCompatible(params);
}
