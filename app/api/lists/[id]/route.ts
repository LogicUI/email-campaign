import { NextResponse } from "next/server";

import { requireAppUser } from "@/api/_lib/app-user";
import { getSavedListById } from "@/core/persistence/saved-lists-repo";

export async function GET(_: Request, context: { params: { id: string } }) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const savedList = await getSavedListById(auth.userId, context.params.id);

  if (!savedList) {
    return NextResponse.json(
      {
        ok: false,
        error: "Saved list not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      savedList,
    },
  });
}
