import OpenAI from "openai";

import type { AiProviderParsedResponse, AiStreamDraftParams } from "@/types/ai-provider";

/**
 * Normalizes streamed delta payloads from OpenAI-compatible chat APIs.
 *
 * Different SDKs may surface deltas as strings or structured content parts. This
 * helper collapses those variants into plain text for the regenerate stream.
 *
 * @param delta Provider delta payload from the SDK.
 * @returns Plain text delta content.
 */
function getDeltaText(delta: unknown) {
  if (typeof delta === "string") {
    return delta;
  }

  if (!Array.isArray(delta)) {
    return "";
  }

  return delta
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
 * Streams a regenerated draft from an OpenAI-compatible chat endpoint.
 *
 * This adapter is shared by OpenAI itself and compatible providers such as DeepSeek
 * so the app only needs one implementation for streaming text-delta handling.
 *
 * @param params Provider request parameters plus streaming callbacks.
 * @param options.baseURL Optional alternate API base URL for compatible providers.
 * @returns Parsed provider response containing the final body text.
 */
export async function streamWithOpenAiCompatible(
  params: AiStreamDraftParams,
  options?: {
    baseURL?: string;
  },
): Promise<AiProviderParsedResponse> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: options?.baseURL,
  });

  const stream = await client.chat.completions.create({
    model: params.model,
    stream: true,
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

  let body = "";

  for await (const chunk of stream) {
    const delta = getDeltaText(chunk.choices[0]?.delta?.content);

    if (!delta) {
      continue;
    }

    body += delta;
    await params.onBodyDelta(delta);
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    body: trimmedBody,
  };
}
