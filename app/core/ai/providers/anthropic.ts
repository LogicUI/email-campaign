import Anthropic from "@anthropic-ai/sdk";

import type { AiProviderParsedResponse, AiStreamDraftParams } from "@/types/ai-provider";

/**
 * Streams a regenerated draft from Anthropic and forwards incremental body deltas.
 *
 * @param params Provider request parameters plus streaming callbacks.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithAnthropic(
  params: AiStreamDraftParams,
): Promise<AiProviderParsedResponse> {
  const client = new Anthropic({
    apiKey: params.apiKey,
  });

  const stream = client.messages.stream({
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

  let body = "";

  stream.on("text", (textDelta) => {
    body += textDelta;
    void params.onBodyDelta(textDelta);
  });

  await stream.finalMessage();

  const content = body.trim();

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: content,
  };
}
