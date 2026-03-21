import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAppUser } from "@/api/_lib/app-user";
import {
  buildSuggestedMappings,
  describePostgresTable,
} from "@/core/database/postgres-connector";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { describeDatabaseTableRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = describeDatabaseTableRequestSchema.parse(await request.json());
    const schema = await describePostgresTable({
      connection: body.connection,
      schema: body.table.schema,
      table: body.table.name,
    });

    return NextResponse.json({
      ok: true,
      data: {
        schema,
        suggestedMappings: buildSuggestedMappings({
          headers: [],
          schema,
        }),
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to load table schema.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
