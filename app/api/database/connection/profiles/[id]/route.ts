import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import { updateConnectionProfileSyncMode } from "@/core/persistence/connection-profiles-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { updateConnectionProfileRequestSchema } from "@/zodSchemas/database";

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = updateConnectionProfileRequestSchema.parse(await request.json());
    const connectionProfile = await updateConnectionProfileSyncMode({
      profileId: context.params.id,
      userId: auth.userId,
      syncMode: body.syncMode,
    });

    if (!connectionProfile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Connection profile not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        connectionProfile,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to update connection profile.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
