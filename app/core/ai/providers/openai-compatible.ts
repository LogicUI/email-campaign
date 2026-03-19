import OpenAI from "openai";

import type { AiProviderParsedResponse, AiStreamDraftParams } from "@/types/ai-provider";

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
