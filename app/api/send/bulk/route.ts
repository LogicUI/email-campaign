import { NextRequest } from "next/server";

import {
  createAuthErrorResponse,
  getAuthToken,
  requireApiSession,
} from "@/api/_lib/api-auth";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { chunk } from "@/core/utils/chunk";
import { renderHtmlFromText } from "@/core/email/render-email";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { sendGmailMessage } from "@/core/integrations/gmail-client";
import {
  bulkSendRequestSchema,
  getZodErrorMessage,
} from "@/zodSchemas/api";
import { logger } from "@/lib/logger";
import type { BulkSendResponse, BulkSendResultItem } from "@/types/api";

const CONCURRENCY = 5;

export const POST = withApiHandler(async (request: Request) => {
  const authResult = await requireApiSession();

  if ("response" in authResult) {
    return authResult.response;
  }

  const body = await request.json();
  const parsedPayload = bulkSendRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;

  // Log incoming request details
  logger.info({
    event: 'bulk_send_request',
    recipientCount: payload.recipients.length,
    firstRecipient: {
      id: payload.recipients[0]?.id,
      email: payload.recipients[0]?.email,
      bodyLength: payload.recipients[0]?.body?.length,
      hasAttachments: !!payload.recipients[0]?.attachments?.length,
      attachmentCount: payload.recipients[0]?.attachments?.length,
    }
  }, 'Bulk send request received');

  const req = request as unknown as NextRequest;
  const authToken = await getAuthToken(req);

  let accessToken: string;
  try {
    accessToken = await getValidGoogleAccessToken(authToken);
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return createAuthErrorResponse("REAUTH_REQUIRED");
    }
    
    throw error;
  }

  const results: BulkSendResultItem[] = [];

  for (const group of chunk(payload.recipients, CONCURRENCY)) {
    const settled = await Promise.allSettled(
      group.map(async (recipient) => {
        let response;
        try {
          response = await sendGmailMessage({
            accessToken,
            attachments: recipient.attachments,
            bodyHtml: renderHtmlFromText(recipient.body),
            bodyText: recipient.body,
            ccEmails: recipient.ccEmails,
            fromEmail: authResult.session.user.email,
            subject: recipient.subject,
            toEmail: recipient.email,
          });
        } catch (error) {
          console.error(`Gmail send failed for ${recipient.email}:`, error);
          throw error;
        }

        logger.info({
          event: 'email_sent',
          recipientId: recipient.id,
          toEmail: recipient.email,
          subject: recipient.subject,
          bodyLength: recipient.body?.length,
          hasAttachments: !!recipient.attachments?.length,
          attachmentCount: recipient.attachments?.length,
        }, 'Email sent successfully');

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
