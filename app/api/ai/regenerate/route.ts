import { NextResponse } from "next/server";

import { getOpenAiClient, getOpenAiModel } from "@/core/integrations/openai-client";
import {
  getZodErrorMessage,
  regenerateProviderResponseSchema,
  regenerateRequestSchema,
} from "@/zodSchemas/api";
import type { RegenerateRequest, RegenerateResponse } from "@/types/api";

function buildPrompt(body: RegenerateRequest) {
  return [
    "Rewrite a single outbound email draft.",
    "Keep the tone concise, helpful, and personalized.",
    "Do not invent facts that are not in the recipient fields or draft.",
    "Return strict JSON with keys: body, subject, reasoning.",
    `Rewrite mode: ${body.mode ?? "refresh"}`,
    `Global subject template: ${body.globalSubject}`,
    `Global body template: ${body.globalBodyTemplate}`,
    `Current draft: ${body.currentBody}`,
    `Recipient email: ${body.recipient.email}`,
    `Recipient fields: ${JSON.stringify(body.recipient.fields)}`,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const parsedPayload = regenerateRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json<RegenerateResponse>(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const client = getOpenAiClient();
    const model = getOpenAiModel();
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You rewrite outbound sales emails. Output valid JSON only. Keep the body under 180 words unless the current draft is shorter.",
        },
        {
          role: "user",
          content: buildPrompt(payload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response.");
    }

    const parsedResponse = regenerateProviderResponseSchema.safeParse(JSON.parse(content));

    if (!parsedResponse.success) {
      throw new Error(getZodErrorMessage(parsedResponse.error));
    }

    const parsed = parsedResponse.data;
    return NextResponse.json<RegenerateResponse>({
      ok: true,
      data: {
        recipientId: payload.recipientId,
        subject: parsed.subject?.trim() || undefined,
        body: parsed.body.trim(),
        reasoning: parsed.reasoning?.trim(),
      },
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";

    return NextResponse.json<RegenerateResponse>(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
