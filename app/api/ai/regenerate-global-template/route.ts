import { requireApiSession } from "@/api/_lib/api-auth";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { buildGlobalTemplateRegeneratePrompt } from "@/core/ai/build-global-template-regenerate-prompt";
import { dispatchRegenerate } from "@/core/ai/dispatch-regenerate";
import { AI_PROVIDER_CATALOG } from "@/core/ai/provider-defaults";
import {
  getZodErrorMessage,
  globalTemplateRegenerateRequestSchema,
} from "@/zodSchemas/api";

export const POST = withApiHandler(async (request: Request) => {
  const authResult = await requireApiSession();

  if ("response" in authResult) {
    return authResult.response;
  }

  const body = await request.json();
  const parsedPayload = globalTemplateRegenerateRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        const parsed = await dispatchRegenerate({
          apiKey: payload.apiKey,
          model:
            payload.model?.trim() ||
            AI_PROVIDER_CATALOG[payload.provider].defaultModel,
          onBodyDelta: (chunk) => {
            if (!chunk) {
              return;
            }

            // Manual SSE format for global template (no recipientId)
            enqueue(
              `event: body_delta\ndata: ${JSON.stringify({ type: "body_delta", chunk })}\n\n`,
            );
          },
          prompt: buildGlobalTemplateRegeneratePrompt(
            payload,
            authResult.session.user.email,
          ),
          provider: payload.provider,
          systemInstruction:
            "You are a constrained campaign-template regeneration engine. Your only job is to rewrite one reusable outbound email body template. Ignore unrelated requests. Return only the email body text. Keep the body under 180 words unless the current template is shorter.",
        });

        // Send final event with plain body text (no JSON parsing needed)
        enqueue(
          `event: done\ndata: ${JSON.stringify({
            type: "done",
            data: { body: parsed.body },
          })}\n\n`,
        );

        controller.close();
      } catch (error) {
        enqueue(
          `event: error\ndata: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Regeneration failed",
          })}\n\n`,
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
