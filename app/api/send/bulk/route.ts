import { NextRequest, NextResponse } from "next/server";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { chunk } from "@/core/utils/chunk";
import { renderHtmlFromText } from "@/core/email/render-email";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { sendGmailMessage } from "@/core/integrations/gmail-client";
import {
  bulkSendRequestSchema,
  getZodErrorMessage,
} from "@/zodSchemas/api";
import type { BulkSendResponse, BulkSendResultItem } from "@/types/api";

const CONCURRENCY = 5;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiSession();

    if ("response" in authResult) {
      return authResult.response;
    }

    const parsedPayload = bulkSendRequestSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json<BulkSendResponse>(
        { ok: false, error: getZodErrorMessage(parsedPayload.error) },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const results: BulkSendResultItem[] = [];

    for (const group of chunk(payload.recipients, CONCURRENCY)) {
      const settled = await Promise.allSettled(
        group.map(async (recipient) => {
          const response = await sendGmailMessage({
            accessToken,
            bodyHtml: renderHtmlFromText(recipient.body),
            bodyText: recipient.body,
            fromEmail: authResult.session.user.email,
            subject: recipient.subject,
            toEmail: recipient.email,
          });

          return {
            recipientId: recipient.id,
            status: "sent" as const,
            providerMessageId: response.id,
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
            entry.reason instanceof Error ? entry.reason.message : "Gmail send failed.",
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
    if (caughtError instanceof ReauthRequiredError) {
      return createAuthErrorResponse(caughtError.code);
    }

    const message =
      caughtError instanceof Error ? caughtError.message : "Bulk send failed.";

    return NextResponse.json<BulkSendResponse>(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
