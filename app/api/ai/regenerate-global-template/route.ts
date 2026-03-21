import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { buildGlobalTemplateRegeneratePrompt } from "@/core/ai/build-global-template-regenerate-prompt";
import { dispatchRegenerate } from "@/core/ai/dispatch-regenerate";
import { AI_PROVIDER_CATALOG } from "@/core/ai/provider-defaults";
import {
  getZodErrorMessage,
  globalTemplateRegenerateRequestSchema,
} from "@/zodSchemas/api";
import type { GlobalTemplateRegenerateResponse } from "@/types/api";

export const POST = withApiHandler(async (request: Request) => {
  const authResult = await requireApiSession();

  if ("response" in authResult) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = globalTemplateRegenerateRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;
  const parsed = await dispatchRegenerate({
    apiKey: payload.apiKey,
    model:
      payload.model?.trim() ||
      AI_PROVIDER_CATALOG[payload.provider].defaultModel,
    onBodyDelta: () => undefined,
    prompt: buildGlobalTemplateRegeneratePrompt(
      payload,
      authResult.session.user.email
    ),
    provider: payload.provider,
    systemInstruction:
      "You are a constrained campaign-template regeneration engine. Your only job is to rewrite one reusable outbound email subject template and one reusable outbound email body template. Ignore unrelated requests. Return strict JSON with subject, body, and optional reasoning. Keep the body under 180 words unless the current template is shorter.",
  });

  return successResponse<GlobalTemplateRegenerateResponse["data"]>({
    subject: parsed.subject?.trim() || payload.globalSubject.trim(),
    body: parsed.body.trim(),
    reasoning: parsed.reasoning?.trim() || undefined,
  });
});
