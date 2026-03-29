import { GoogleGenAI } from "@google/genai";

import type { AiGenerateDraftParams, AiProviderParsedResponse } from "@/types/ai-provider";

/**
 * Generates a regenerated draft from Google's Gemini API.
 *
 * @param params Provider request parameters.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithGoogle(
  params: AiGenerateDraftParams,
): Promise<AiProviderParsedResponse> {
  const client = new GoogleGenAI({
    apiKey: params.apiKey,
  });

  const response = await client.models.generateContent({
    model: params.model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
    },
  });

  const content = response.text?.trim() ?? "";

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: content,
  };
}
