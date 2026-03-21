import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireApiSession } from "@/api/_lib/api-auth";
import { fetchRowsFromPostgresTable } from "@/core/database/postgres-connector";
import { buildImportPreview } from "@/core/excel/build-import-preview";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { describeDatabaseTableRequestSchema } from "@/zodSchemas/database";

export async function POST(request: Request) {
  const auth = await requireApiSession();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = describeDatabaseTableRequestSchema.parse(await request.json());
    const rows = await fetchRowsFromPostgresTable({
      connection: body.connection,
      schema: body.table.schema,
      table: body.table.name,
    });

    const preview = buildImportPreview({
      sourceType: "database_table",
      databaseConnectionLabel: body.connection.label,
      databaseTableName: body.table.displayName,
      sourceFiles: [
        {
          fileName: body.table.displayName,
        },
      ],
      sourceRows: rows.map((row, index) => ({
        raw: row,
        sourceFileName: body.table.displayName,
        originalRowIndex: index + 1,
      })),
    });

    return NextResponse.json({
      ok: true,
      data: {
        preview,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to import rows from the selected database table.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
