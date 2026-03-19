import { streamWithOpenAiCompatible } from "@/core/ai/providers/openai-compatible";
import type { AiStreamDraftParams } from "@/types/ai-provider";

export async function generateWithOpenAi(params: AiStreamDraftParams) {
  return streamWithOpenAiCompatible(params);
}
