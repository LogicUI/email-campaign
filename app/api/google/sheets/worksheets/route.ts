import { NextRequest } from "next/server";

import { getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { successResponse, withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { getGoogleSpreadsheetMetadata } from "@/core/integrations/google-sheets-client";
import type { GoogleSheetWorksheetsResponseData } from "@/types/google";

export const GET = withApiHandler(async (request: Request) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
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
      throw new AuthenticationError("Google access expired. Sign in again to continue.");
    }
    throw error;
  }

  const metadata = await getGoogleSpreadsheetMetadata({
    accessToken,
    spreadsheetId,
  });

  return successResponse<GoogleSheetWorksheetsResponseData>(metadata);
});
