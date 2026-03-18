import { NextResponse } from "next/server";

import { getResendClient, getResendFromEmail } from "@/lib/server/resend-client";
import { renderHtmlFromText } from "@/lib/server/render-email";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      to?: string;
      subject?: string;
      body?: string;
    };

    if (!payload.to || !payload.subject || !payload.body) {
      return NextResponse.json(
        { ok: false, error: "Invalid test email payload." },
        { status: 400 },
      );
    }

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
