import { requireApiSession } from "@/api/_lib/api-auth";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { fetchRowsFromPostgresTable } from "@/core/database/postgres-connector";
import { buildImportPreview } from "@/core/excel/build-import-preview";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { describeDatabaseTableRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireApiSession();

  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const parsedPayload = describeDatabaseTableRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const data = parsedPayload.data;
  const rows = await fetchRowsFromPostgresTable({
    connection: data.connection,
    schema: data.table.schema,
    table: data.table.name,
  });

  const preview = buildImportPreview({
    sourceType: "database_table",
    databaseConnectionLabel: data.connection.label,
    databaseTableName: data.table.displayName,
    sourceFiles: [
      {
        fileName: data.table.displayName,
      },
    ],
    sourceRows: rows.map((row, index) => ({
      raw: row,
      sourceFileName: data.table.displayName,
      originalRowIndex: index + 1,
    })),
  });

  return successResponse({
    preview,
  });
});
