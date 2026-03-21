import { generateWithAnthropic } from "@/core/ai/providers/anthropic";
import { generateWithDeepSeek } from "@/core/ai/providers/deepseek";
import { generateWithGoogle } from "@/core/ai/providers/google";
import { generateWithOpenAi } from "@/core/ai/providers/openai";
import type { DispatchRegenerateParams } from "@/types/ai-provider";

/**
 * Routes a regenerate request to the configured AI provider implementation.
 *
 * This keeps provider selection in one place so the route handler and hooks do not
 * need provider-specific branching logic.
 *
 * @param params Fully resolved provider request parameters.
 * @returns Provider-generated draft response.
 */
export async function dispatchRegenerate(params: DispatchRegenerateParams) {
  switch (params.provider) {
    case "openai":
      return generateWithOpenAi(params);
    case "deepseek":
      return generateWithDeepSeek(params);
    case "anthropic":
      return generateWithAnthropic(params);
    case "google":
      return generateWithGoogle(params);
    default:
      throw new Error("Unsupported AI provider.");
  }
}
