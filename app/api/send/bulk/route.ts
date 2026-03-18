import { NextResponse } from "next/server";

import { chunk } from "@/core/utils/chunk";
import { renderHtmlFromText } from "@/core/email/render-email";
import { getResendClient, getResendFromEmail } from "@/core/integrations/resend-client";
import {
  bulkSendRequestSchema,
  getZodErrorMessage,
} from "@/zodSchemas/api";
import type { BulkSendResponse, BulkSendResultItem } from "@/types/api";

const CONCURRENCY = 5;

export async function POST(request: Request) {
  try {
    const parsedPayload = bulkSendRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json<BulkSendResponse>(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
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
