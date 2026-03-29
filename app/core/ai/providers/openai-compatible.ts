import OpenAI from "openai";

import type { AiGenerateDraftParams, AiProviderParsedResponse } from "@/types/ai-provider";

/**
 * Normalizes message content payloads from OpenAI-compatible chat APIs.
 *
 * Different SDKs may surface content as strings or structured content parts. This
 * helper collapses those variants into plain text for the regenerate response.
 *
 * @param content Provider content payload from the SDK.
 * @returns Plain text message content.
 */
function getMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");
}

/**
 * Generates a regenerated draft from an OpenAI-compatible chat endpoint.
 *
 * This adapter is shared by OpenAI itself and compatible providers such as DeepSeek
 * so the app only needs one implementation for plain text response handling.
 *
 * @param params Provider request parameters.
 * @param options.baseURL Optional alternate API base URL for compatible providers.
 * @returns Parsed provider response containing the final body text.
 */
export async function generateWithOpenAiCompatible(
  params: AiGenerateDraftParams,
  options?: {
    baseURL?: string;
  },
): Promise<AiProviderParsedResponse> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: options?.baseURL,
  });

  const completion = await client.chat.completions.create({
    model: params.model,
    messages: [
      {
        role: "system",
        content: params.systemInstruction,
      },
      {
        role: "user",
        content: params.prompt,
      },
    ],
  });

  const trimmedBody = getMessageText(completion.choices[0]?.message?.content).trim();

  if (!trimmedBody) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: trimmedBody,
  };
}
