import { NextResponse } from "next/server";

import { requireAppUser } from "@/api/_lib/app-user";
import { listSavedListsForUser } from "@/core/persistence/saved-lists-repo";

export async function GET() {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const savedLists = await listSavedListsForUser(auth.userId);

  return NextResponse.json({
    ok: true,
    data: {
      savedLists,
    },
  });
}
