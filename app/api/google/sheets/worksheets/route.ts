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
import { getGoogleSpreadsheetMetadata } from "@/core/integrations/google-sheets-client";
import type { GoogleSheetWorksheetsResponseData } from "@/types/google";

export const GET = withApiHandler(async (request: Request) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    return auth.response;
  }

  const req = request as unknown as NextRequest;
  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId")?.trim();

  if (!spreadsheetId) {
    throw new ValidationError("Spreadsheet id is required.");
  }

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

  const metadata = await getGoogleSpreadsheetMetadata({
    accessToken,
    spreadsheetId,
  });

  return successResponse<GoogleSheetWorksheetsResponseData>(metadata);
});
