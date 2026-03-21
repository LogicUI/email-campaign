import { NextResponse } from "next/server";

import { requireAppUser } from "@/api/_lib/app-user";
import { getCampaignHistoryById } from "@/core/persistence/campaign-history-repo";

export async function GET(_: Request, context: { params: { id: string } }) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const campaign = await getCampaignHistoryById(auth.userId, context.params.id);

  if (!campaign) {
    return NextResponse.json(
      {
        ok: false,
        error: "Campaign not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      campaign,
    },
  });
}
