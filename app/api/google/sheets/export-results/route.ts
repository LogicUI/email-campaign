import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAuthErrorResponse, getAuthToken, requireApiSession } from "@/api/_lib/api-auth";
import { ReauthRequiredError, getValidGoogleAccessToken } from "@/core/auth/google-access-token";
import { appendCampaignResultsToGoogleSheet } from "@/core/integrations/google-sheets-client";
import type { GoogleSheetExportResponseData } from "@/types/google";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { exportGoogleSheetResultsRequestSchema } from "@/zodSchemas/google";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiSession();

    if ("response" in auth) {
      return auth.response;
    }

    const body = exportGoogleSheetResultsRequestSchema.parse(await request.json());
    const authToken = await getAuthToken(request);
    const accessToken = await getValidGoogleAccessToken(authToken);
    const payload = await appendCampaignResultsToGoogleSheet({
      accessToken,
      spreadsheetId: body.spreadsheetId,
      worksheetTitle: body.worksheetTitle?.trim() || "EmailAI Results",
      campaignName: body.campaignName,
      senderEmail: body.senderEmail,
      globalSubject: body.globalSubject,
      recipients: body.recipients,
    });

    return NextResponse.json<{
      ok: true;
      data: GoogleSheetExportResponseData;
    }>({
      ok: true,
      data: payload,
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
          : "Unable to save campaign results to Google Sheets.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
