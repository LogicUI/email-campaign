import { NextRequest } from "next/server";

import {
  createAuthErrorResponse,
  getAuthToken,
  requireApiSession,
} from "@/api/_lib/api-auth";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { renderHtmlFromText, renderTextFromHtml } from "@/core/email/render-email";
import { sendGmailMessage } from "@/core/integrations/gmail-client";
import { getZodErrorMessage, testEmailRequestSchema } from "@/zodSchemas/api";
import { logger } from "@/lib/logger";

export const POST = withApiHandler(async (request: Request) => {
  const authResult = await requireApiSession();

  if ("response" in authResult) {
    return authResult.response;
  }

  const body = await request.json();
  const parsedPayload = testEmailRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;

  // Log incoming test email request details
  logger.info({
    event: 'test_send_request',
    toEmail: payload.to,
    subject: payload.subject,
    bodyLength: payload.body?.length,
    ccEmails: payload.ccEmails,
    hasAttachments: !!payload.attachments?.length,
    attachmentCount: payload.attachments?.length,
  }, 'Test email request received');

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

  let response;
  try {
    const bodyHtml =
      payload.bodyHtml && payload.bodyHtml.trim().length > 0
        ? payload.bodyHtml
        : renderHtmlFromText(payload.body);
    const bodyText =
      payload.bodyText && payload.bodyText.trim().length > 0
        ? payload.bodyText
        : renderTextFromHtml(bodyHtml);

    response = await sendGmailMessage({
      accessToken,
      attachments: payload.attachments,
      bodyHtml,
      bodyText,
      ccEmails: payload.ccEmails,
      fromEmail: authResult.session.user.email,
      subject: payload.subject,
      toEmail: payload.to,
    });
  } catch (error) {
    console.error('Gmail send failed:', error);
    throw error;
  }

  logger.info({
    event: 'test_email_sent',
    toEmail: payload.to,
    subject: payload.subject,
    bodyLength: payload.body?.length,
    hasAttachments: !!payload.attachments?.length,
    attachmentCount: payload.attachments?.length,
    providerMessageId: response.id,
  }, 'Test email sent successfully');

  return successResponse({
    providerMessageId: response.id,
  });
});
