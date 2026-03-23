import { NextRequest } from "next/server";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { importGoogleWorksheetAsPreview } from "@/core/integrations/google-sheets-client";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { importGoogleSheetRequestSchema } from "@/zodSchemas/google";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const parsedPayload = importGoogleSheetRequestSchema.safeParse(body);

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

  const result = await importGoogleWorksheetAsPreview({
    accessToken,
    spreadsheetId: payload.spreadsheetId,
    worksheetTitle: payload.worksheetTitle,
  });

  return successResponse({
    preview: result.preview,
  });
});
