import { GoogleGenAI } from "@google/genai";

import type { AiProviderParsedResponse, AiStreamDraftParams } from "@/types/ai-provider";

/**
 * Streams a regenerated draft from Google's Gemini API and forwards body deltas.
 *
 * @param params Provider request parameters plus streaming callbacks.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithGoogle(
  params: AiStreamDraftParams,
): Promise<AiProviderParsedResponse> {
  const client = new GoogleGenAI({
    apiKey: params.apiKey,
  });

  const response = await client.models.generateContentStream({
    model: params.model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
    },
  });

  let body = "";

  for await (const chunk of response) {
    const text = chunk.text;

    if (!text) {
      continue;
    }

    body += text;
    await params.onBodyDelta(text);
  }

  const content = body.trim();

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: content,
  };
}
