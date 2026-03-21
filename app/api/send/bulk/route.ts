import { NextRequest } from "next/server";

import { getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { successResponse, withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
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

export const POST = withApiHandler(async (request: Request) => {
  const authResult = await requireApiSession();

  if ("response" in authResult) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = bulkSendRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;
  const req = request as unknown as NextRequest;
  const authToken = await getAuthToken(req);

  let accessToken: string;
  try {
    accessToken = await getValidGoogleAccessToken(authToken);
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      throw new AuthenticationError(
        "Google access expired. Sign in again to continue."
      );
    }
    throw error;
  }

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
      })
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
          entry.reason instanceof Error
            ? entry.reason.message
            : "Gmail send failed.",
      });
    });
  }

  return successResponse<BulkSendResponse["data"]>({
    sendJobId: payload.sendJobId,
    results,
  });
});
