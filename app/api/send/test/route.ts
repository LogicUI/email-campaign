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
import { renderHtmlFromText } from "@/core/email/render-email";
import { sendGmailMessage } from "@/core/integrations/gmail-client";
import { getZodErrorMessage, testEmailRequestSchema } from "@/zodSchemas/api";

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

  const response = await sendGmailMessage({
    accessToken,
    bodyHtml: renderHtmlFromText(payload.body),
    bodyText: payload.body,
    ccEmails: payload.ccEmails,
    fromEmail: authResult.session.user.email,
    subject: payload.subject,
    toEmail: payload.to,
  });

  return successResponse({
    providerMessageId: response.id,
  });
});
