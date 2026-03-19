import { NextRequest, NextResponse } from "next/server";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { renderHtmlFromText } from "@/core/email/render-email";
import { sendGmailMessage } from "@/core/integrations/gmail-client";
import { getZodErrorMessage, testEmailRequestSchema } from "@/zodSchemas/api";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiSession();

    if ("response" in authResult) {
      return authResult.response;
    }

    const parsedPayload = testEmailRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const response = await sendGmailMessage({
      accessToken,
      bodyHtml: renderHtmlFromText(payload.body),
      bodyText: payload.body,
      fromEmail: authResult.session.user.email,
      subject: payload.subject,
      toEmail: payload.to,
    });

    return NextResponse.json({
      ok: true,
      data: {
        providerMessageId: response.id,
      },
    });
  } catch (caughtError) {
    if (caughtError instanceof ReauthRequiredError) {
      return createAuthErrorResponse(caughtError.code);
    }

    const message =
      caughtError instanceof Error ? caughtError.message : "Test email failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
