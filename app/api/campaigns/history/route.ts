import { NextResponse } from "next/server";

import { requireAppUser } from "@/api/_lib/app-user";
import { listCampaignHistoryForUser } from "@/core/persistence/campaign-history-repo";

export async function GET() {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const campaigns = await listCampaignHistoryForUser(auth.userId);

  return NextResponse.json({
    ok: true,
    data: {
      campaigns,
    },
  });
}
