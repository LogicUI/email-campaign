import { NextResponse } from "next/server";

import { requireApiSession } from "@/api/_lib/api-auth";
import { buildRegeneratePrompt } from "@/core/ai/build-regenerate-prompt";
import { dispatchRegenerate } from "@/core/ai/dispatch-regenerate";
import { AI_PROVIDER_CATALOG } from "@/core/ai/provider-defaults";
import { formatSseEvent } from "@/core/ai/sse";
import {
  getZodErrorMessage,
  regenerateRequestSchema,
} from "@/zodSchemas/api";
import type { RegenerateResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    const authResult = await requireApiSession();

    if ("response" in authResult) {
      return authResult.response;
    }

    const parsedPayload = regenerateRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json<RegenerateResponse>(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        };

        try {
          enqueue(
            formatSseEvent({
              type: "start",
              recipientId: payload.recipientId,
            }),
          );

          const parsed = await dispatchRegenerate({
            apiKey: payload.apiKey,
            model:
              payload.model?.trim() || AI_PROVIDER_CATALOG[payload.provider].defaultModel,
            onBodyDelta: (chunk) => {
              if (!chunk) {
                return;
              }

              enqueue(
                formatSseEvent({
                  type: "body_delta",
                  recipientId: payload.recipientId,
                  chunk,
                }),
              );
            },
            prompt: buildRegeneratePrompt(payload, authResult.session.user.email),
            provider: payload.provider,
            systemInstruction:
              "You rewrite outbound sales emails. Return only the final email body text. Keep it under 180 words unless the current draft is shorter.",
          });

          enqueue(
            formatSseEvent({
              type: "final",
              recipientId: payload.recipientId,
              subject: parsed.subject?.trim() || undefined,
              body: parsed.body.trim(),
              reasoning: parsed.reasoning?.trim(),
            }),
          );
        } catch (caughtError) {
          const message =
            caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";

          enqueue(
            formatSseEvent({
              type: "error",
              recipientId: payload.recipientId,
              error: message,
            }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";

    return NextResponse.json<RegenerateResponse>(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
