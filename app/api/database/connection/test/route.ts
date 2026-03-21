import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import { testPostgresConnection } from "@/core/database/postgres-connector";
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

    return NextResponse.json({
      ok: true,
      data: {
        reachable: true,
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
