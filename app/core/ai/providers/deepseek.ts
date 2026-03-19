import { streamWithOpenAiCompatible } from "@/core/ai/providers/openai-compatible";
import type { AiStreamDraftParams } from "@/types/ai-provider";

export async function generateWithDeepSeek(params: AiStreamDraftParams) {
  return streamWithOpenAiCompatible(params, {
    baseURL: "https://api.deepseek.com",
  });
}
