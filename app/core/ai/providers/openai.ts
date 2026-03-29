import { generateWithOpenAiCompatible } from "@/core/ai/providers/openai-compatible";
import type { AiGenerateDraftParams } from "@/types/ai-provider";

/**
 * Runs regeneration against OpenAI through the shared OpenAI-compatible adapter.
 *
 * @param params Provider request parameters.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithOpenAi(params: AiGenerateDraftParams) {
  return generateWithOpenAiCompatible(params);
}
