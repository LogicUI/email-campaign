import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import {
  listPostgresTables,
  normalizeConnectionProfile,
  testPostgresConnection,
} from "@/core/database/postgres-connector";
import { upsertConnectionProfile } from "@/core/persistence/connection-profiles-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { testDatabaseConnectionRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = testDatabaseConnectionRequestSchema.parse(await request.json());
    await testPostgresConnection(body.connection);
    const metadata = normalizeConnectionProfile(body.connection);
    const profile = await upsertConnectionProfile({
      userId: auth.userId,
      provider: body.connection.provider,
      label: metadata.label,
      displayHost: metadata.displayHost,
      displayDatabaseName: metadata.displayDatabaseName,
      displayProjectRef: metadata.displayProjectRef,
      syncMode: body.connection.syncMode,
    });
    const tables = await listPostgresTables(body.connection);

    return NextResponse.json({
      ok: true,
      data: {
        connectionProfile: profile,
        tables,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to connect to the database.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
