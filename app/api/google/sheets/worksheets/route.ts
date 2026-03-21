import { NextRequest, NextResponse } from "next/server";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { getGoogleSpreadsheetMetadata } from "@/core/integrations/google-sheets-client";
import type { GoogleSheetWorksheetsResponseData } from "@/types/google";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiSession();

    if ("response" in auth) {
      return auth.response;
    }

    const spreadsheetId = request.nextUrl.searchParams.get("spreadsheetId")?.trim();

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Spreadsheet id is required.",
        },
        { status: 400 },
      );
    }

    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const metadata = await getGoogleSpreadsheetMetadata({
      accessToken,
      spreadsheetId,
    });

    return NextResponse.json<{
      ok: true;
      data: GoogleSheetWorksheetsResponseData;
    }>({
      ok: true,
      data: metadata,
    });
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return createAuthErrorResponse(error.code);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to load Google worksheet details.",
      },
      { status: 400 },
    );
  }
}
