import { NextResponse } from "next/server";

import { requireAppUser } from "@/api/_lib/app-user";
import { getDashboardSummaryForUser } from "@/core/persistence/dashboard-summary";

export async function GET() {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const summary = await getDashboardSummaryForUser(auth.userId);

  return NextResponse.json({
    ok: true,
    data: summary,
  });
}
