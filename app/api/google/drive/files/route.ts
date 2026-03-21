import { NextRequest } from "next/server";

import { getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { successResponse, withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError } from "@/core/errors/error-classes";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { listGoogleSpreadsheetFiles } from "@/core/integrations/google-drive-client";
import type { GoogleDriveFilesResponseData } from "@/types/google";

export const GET = withApiHandler(async (request: Request) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const req = request as unknown as NextRequest;
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

  const query = req.nextUrl.searchParams.get("query") ?? "";
  const files = await listGoogleSpreadsheetFiles({
    accessToken,
    query,
  });

  return successResponse<GoogleDriveFilesResponseData>({
    files,
  });
});
