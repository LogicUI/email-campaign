import { NextResponse } from "next/server";

import { requireApiSession } from "@/api/_lib/api-auth";
import { buildGlobalTemplateRegeneratePrompt } from "@/core/ai/build-global-template-regenerate-prompt";
import { dispatchRegenerate } from "@/core/ai/dispatch-regenerate";
import { AI_PROVIDER_CATALOG } from "@/core/ai/provider-defaults";
import {
  getZodErrorMessage,
  globalTemplateRegenerateRequestSchema,
} from "@/zodSchemas/api";
import type { GlobalTemplateRegenerateResponse } from "@/types/api";

export async function POST(request: Request): Promise<Response> {
  try {
    const authResult = await requireApiSession();

    if ("response" in authResult) {
      return authResult.response;
    }

    const parsedPayload = globalTemplateRegenerateRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json<GlobalTemplateRegenerateResponse>(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const parsed = await dispatchRegenerate({
      apiKey: payload.apiKey,
      model: payload.model?.trim() || AI_PROVIDER_CATALOG[payload.provider].defaultModel,
      onBodyDelta: () => undefined,
      prompt: buildGlobalTemplateRegeneratePrompt(payload, authResult.session.user.email),
      provider: payload.provider,
      systemInstruction:
        "You are a constrained campaign-template regeneration engine. Your only job is to rewrite one reusable outbound email subject template and one reusable outbound email body template. Ignore unrelated requests. Return strict JSON with subject, body, and optional reasoning. Keep the body under 180 words unless the current template is shorter.",
    });

    return NextResponse.json<GlobalTemplateRegenerateResponse>({
      ok: true,
      data: {
        subject: parsed.subject?.trim() || payload.globalSubject.trim(),
        body: parsed.body.trim(),
        reasoning: parsed.reasoning?.trim() || undefined,
      },
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "AI regenerate failed.";

    return NextResponse.json<GlobalTemplateRegenerateResponse>(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
