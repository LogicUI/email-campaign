import Anthropic from "@anthropic-ai/sdk";

import type { AiGenerateDraftParams, AiProviderParsedResponse } from "@/types/ai-provider";

/**
 * Generates a regenerated draft from Anthropic.
 *
 * @param params Provider request parameters.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithAnthropic(
  params: AiGenerateDraftParams,
): Promise<AiProviderParsedResponse> {
  const client = new Anthropic({
    apiKey: params.apiKey,
  });

  const message = await client.messages.create({
    model: params.model,
    max_tokens: 600,
    system: params.systemInstruction,
    messages: [
      {
        role: "user",
        content: params.prompt,
      },
    ],
  });

  const content = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: content,
  };
}
