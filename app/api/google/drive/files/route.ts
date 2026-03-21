import { NextRequest, NextResponse } from "next/server";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { listGoogleSpreadsheetFiles } from "@/core/integrations/google-drive-client";
import type { GoogleDriveFilesResponseData } from "@/types/google";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiSession();

    if ("response" in auth) {
      return auth.response;
    }

    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const query = request.nextUrl.searchParams.get("query") ?? "";
    const files = await listGoogleSpreadsheetFiles({
      accessToken,
      query,
    });

    return NextResponse.json<{
      ok: true;
      data: GoogleDriveFilesResponseData;
    }>({
      ok: true,
      data: {
        files,
      },
    });
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return createAuthErrorResponse(error.code);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load Google files.",
      },
      { status: 400 },
    );
  }
}
