import { successResponse } from "@/api/_lib/api-response";
import { requireApiSession } from "@/api/_lib/api-auth";
import { withApiHandler } from "@/api/_lib/error-handler";
import { InternalServerError, ValidationError } from "@/core/errors/error-classes";
import { buildGlobalTemplateRegeneratePrompt } from "@/core/ai/build-global-template-regenerate-prompt";
import { dispatchRegenerate } from "@/core/ai/dispatch-regenerate";
import { AI_PROVIDER_CATALOG } from "@/core/ai/provider-defaults";
import type { AiProviderParsedResponse } from "@/types/ai-provider";
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
  let parsed: AiProviderParsedResponse;
  try {
    parsed = await dispatchRegenerate({
      apiKey: payload.apiKey,
      model:
        payload.model?.trim() ||
        AI_PROVIDER_CATALOG[payload.provider].defaultModel,
      prompt: buildGlobalTemplateRegeneratePrompt(
        payload,
        authResult.session.user.email,
      ),
      provider: payload.provider,
      systemInstruction:
        "You are a constrained campaign-template regeneration engine. Your only job is to rewrite one reusable outbound email body template. Ignore unrelated requests. Return only the email body text. Keep the body under 180 words unless the current template is shorter.",
    });
  } catch (caughtError) {
    throw new InternalServerError(
      caughtError instanceof Error ? caughtError.message : "Regeneration failed",
    );
  }

  return successResponse({
    subject: parsed.subject?.trim() || undefined,
    body: parsed.body.trim(),
    reasoning: parsed.reasoning?.trim(),
  });
});
