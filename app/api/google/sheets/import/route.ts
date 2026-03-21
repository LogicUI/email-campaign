import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { importGoogleWorksheetAsPreview } from "@/core/integrations/google-sheets-client";
import type { GoogleSheetImportResponseData } from "@/types/google";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { importGoogleSheetRequestSchema } from "@/zodSchemas/google";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiSession();

    if ("response" in auth) {
      return auth.response;
    }

    const body = importGoogleSheetRequestSchema.parse(await request.json());
    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const payload = await importGoogleWorksheetAsPreview({
      accessToken,
      spreadsheetId: body.spreadsheetId,
      worksheetTitle: body.worksheetTitle,
    });

    return NextResponse.json<{
      ok: true;
      data: GoogleSheetImportResponseData;
    }>({
      ok: true,
      data: {
        preview: payload.preview,
      },
    });
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return createAuthErrorResponse(error.code);
    }

    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to import the selected Google Sheet.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
