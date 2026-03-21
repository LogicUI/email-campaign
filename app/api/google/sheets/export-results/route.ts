import { NextRequest } from "next/server";

import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { appendCampaignResultsToGoogleSheet } from "@/core/integrations/google-sheets-client";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { exportGoogleSheetResultsRequestSchema } from "@/zodSchemas/google";

export const POST = withApiHandler(async (request: NextRequest) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = exportGoogleSheetResultsRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;
  const authToken = await getAuthToken(request);

  let accessToken: string;
  try {
    accessToken = await getValidGoogleAccessToken(authToken);
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      throw new AuthenticationError("Google access expired. Sign in again to continue.");
    }
    throw error;
  }

  const result = await appendCampaignResultsToGoogleSheet({
    accessToken,
    spreadsheetId: payload.spreadsheetId,
    worksheetTitle: payload.worksheetTitle?.trim() || "EmailAI Results",
    campaignName: payload.campaignName,
    senderEmail: payload.senderEmail,
    globalSubject: payload.globalSubject,
    recipients: payload.recipients,
  });

  return successResponse(result);
});
