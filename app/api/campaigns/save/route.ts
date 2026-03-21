import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import { markConnectionProfileSynced } from "@/core/persistence/connection-profiles-repo";
import { saveCampaignRun } from "@/core/persistence/campaign-history-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { saveCampaignHistoryRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = saveCampaignHistoryRequestSchema.parse(await request.json());
    const syncedAt = body.sentAt ?? new Date().toISOString();
    const campaign = await saveCampaignRun({
      userId: auth.userId,
      campaign: {
        ...body.campaign,
        sourceType: body.campaign.sourceType ?? body.sourceType,
      },
      recipients: body.recipients,
      sourceType: body.sourceType,
      savedListId: body.savedListId,
      sentAt: syncedAt,
    });
    const connectionProfile = body.profileId
      ? await markConnectionProfileSynced({
          profileId: body.profileId,
          userId: auth.userId,
          syncedAt,
        })
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        campaign,
        connectionProfile,
        syncedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to save campaign history.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
