import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import { listPostgresTables } from "@/core/database/postgres-connector";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { listDatabaseTablesRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = listDatabaseTablesRequestSchema.parse(await request.json());
    const tables = await listPostgresTables(body.connection);

    return NextResponse.json({
      ok: true,
      data: {
        tables,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to load database tables.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
