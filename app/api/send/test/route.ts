import { NextResponse } from "next/server";

import { renderHtmlFromText } from "@/core/email/render-email";
import { getResendClient, getResendFromEmail } from "@/core/integrations/resend-client";
import { getZodErrorMessage, testEmailRequestSchema } from "@/zodSchemas/api";

export async function POST(request: Request) {
  try {
    const parsedPayload = testEmailRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: getResendFromEmail(),
      to: payload.to,
      subject: payload.subject,
      text: payload.body,
      html: renderHtmlFromText(payload.body),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return NextResponse.json({
      ok: true,
      data: {
        resendId: response.data?.id,
      },
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Test email failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
