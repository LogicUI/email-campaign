import { NextResponse } from "next/server";

import { chunk } from "@/lib/utils/chunk";
import { getResendClient, getResendFromEmail } from "@/lib/server/resend-client";
import { renderHtmlFromText } from "@/lib/server/render-email";
import type { BulkSendRequest, BulkSendResponse, BulkSendResultItem } from "@/types/api";

const CONCURRENCY = 5;
const MAX_RECIPIENTS = 100;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BulkSendRequest;

    if (!payload.campaignId || !payload.sendJobId || !Array.isArray(payload.recipients)) {
      return NextResponse.json<BulkSendResponse>(
        { ok: false, error: "Invalid bulk send payload." },
        { status: 400 },
      );
    }

    if (payload.recipients.length === 0) {
      return NextResponse.json<BulkSendResponse>(
        { ok: false, error: "No recipients supplied." },
        { status: 400 },
      );
    }

    if (payload.recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json<BulkSendResponse>(
        { ok: false, error: `Limit bulk sends to ${MAX_RECIPIENTS} recipients per request.` },
        { status: 400 },
      );
    }

    const resend = getResendClient();
    const from = getResendFromEmail();
    const results: BulkSendResultItem[] = [];

    for (const group of chunk(payload.recipients, CONCURRENCY)) {
      const settled = await Promise.allSettled(
        group.map(async (recipient) => {
          const response = await resend.emails.send({
            from,
            to: recipient.email,
            subject: recipient.subject,
            text: recipient.body,
            html: renderHtmlFromText(recipient.body),
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          return {
            recipientId: recipient.id,
            status: "sent" as const,
            resendId: response.data?.id,
          };
        }),
      );

      settled.forEach((entry, index) => {
        if (entry.status === "fulfilled") {
          results.push(entry.value);
          return;
        }

        results.push({
          recipientId: group[index].id,
          status: "failed",
          errorMessage:
            entry.reason instanceof Error ? entry.reason.message : "Resend send failed.",
        });
      });
    }

    return NextResponse.json<BulkSendResponse>({
      ok: true,
      data: {
        sendJobId: payload.sendJobId,
        results,
      },
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Bulk send failed.";

    return NextResponse.json<BulkSendResponse>(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
