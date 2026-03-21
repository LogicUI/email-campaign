import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import { createPostgresTable } from "@/core/database/postgres-connector";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { createDatabaseTableRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = createDatabaseTableRequestSchema.parse(await request.json());
    const schema = await createPostgresTable({
      connection: body.connection,
      schema: body.schemaName,
      tableName: body.tableName,
      columns: body.columns,
    });

    return NextResponse.json({
      ok: true,
      data: {
        schema,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to create table.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
