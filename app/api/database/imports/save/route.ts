import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { requireAppUser } from "@/api/_lib/app-user";
import {
  buildSuggestedMappings,
  createPostgresTable,
  describePostgresTable,
  inferPostgresColumns,
  insertRowsIntoPostgresTable,
  normalizeConnectionProfile,
} from "@/core/database/postgres-connector";
import { upsertConnectionProfile } from "@/core/persistence/connection-profiles-repo";
import { saveImportPreviewAsList } from "@/core/persistence/saved-lists-repo";
import type { DatabaseTableSchema } from "@/types/database";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { saveImportToDatabaseRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = saveImportToDatabaseRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const payload = parsedPayload.data;
  const sourceRowCount = payload.preview.rows.length;
  const eligibleRowCount = payload.preview.rows.filter((row) => row.isValid).length;
  let destinationTableName: string | undefined;
  let connectionProfileId: string | undefined;
  let insertSummary: { insertedCount: number } | undefined;
  let tableSchema: DatabaseTableSchema | null = null;

  if (payload.mode !== "app_only") {
    if (!payload.connection) {
      throw new ValidationError("An active database connection is required.");
    }

    const profileMetadata = normalizeConnectionProfile(payload.connection);
    const profile = await upsertConnectionProfile({
      userId: auth.userId,
      provider: payload.connection.provider,
      label: profileMetadata.label,
      displayHost: profileMetadata.displayHost,
      displayDatabaseName: profileMetadata.displayDatabaseName,
      displayProjectRef: profileMetadata.displayProjectRef,
      lastSelectedTable:
        payload.existingTable?.displayName ??
        (payload.newTable ? `${payload.newTable.schemaName}.${payload.newTable.tableName}` : undefined),
    });
    connectionProfileId = profile.id;

    if (payload.mode === "existing_table") {
      if (!payload.existingTable) {
        throw new ValidationError("Select a destination table before saving.");
      }

      const mappings =
        payload.mappings && payload.mappings.length > 0
          ? payload.mappings
          : buildSuggestedMappings({
              headers: payload.preview.headers,
              schema: await describePostgresTable({
                connection: payload.connection,
                schema: payload.existingTable.schema,
                table: payload.existingTable.name,
              }),
            });

      insertSummary = await insertRowsIntoPostgresTable({
        connection: payload.connection,
        schema: payload.existingTable.schema,
        table: payload.existingTable.name,
        mappings,
        preview: payload.preview,
      });
      destinationTableName = payload.existingTable.displayName;
      tableSchema = await describePostgresTable({
        connection: payload.connection,
        schema: payload.existingTable.schema,
        table: payload.existingTable.name,
      });
    }

    if (payload.mode === "new_table") {
      if (!payload.newTable) {
        throw new ValidationError("New table details are required.");
      }

      tableSchema = await createPostgresTable({
        connection: payload.connection,
        schema: payload.newTable.schemaName,
        tableName: payload.newTable.tableName,
        columns:
          payload.newTable.columns.length > 0
            ? payload.newTable.columns
            : inferPostgresColumns(payload.preview),
      });

      if (!tableSchema) {
        throw new ValidationError("The new table could not be created.");
      }

      const createdTableSchema = tableSchema;

      const mappings = payload.mappings?.length
        ? payload.mappings
        : payload.preview.headers.map((header) => ({
            sourceColumn: header,
            destinationColumn:
              createdTableSchema.columns.find(
                (column) =>
                  column.name.toLowerCase() ===
                  header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
              )?.name ?? undefined,
          }));

      insertSummary = await insertRowsIntoPostgresTable({
        connection: payload.connection,
        schema: payload.newTable.schemaName,
        table: createdTableSchema.table.name,
        mappings,
        preview: payload.preview,
      });
      destinationTableName = createdTableSchema.table.displayName;
    }
  }

  const savedList = await saveImportPreviewAsList({
    userId: auth.userId,
    preview: payload.preview,
    name: payload.saveName,
    destinationTableName,
    connectionProfileId,
  });

  return successResponse({
    savedList,
    destinationTableName,
    sourceRowCount,
    eligibleRowCount,
    insertedCount: insertSummary?.insertedCount ?? 0,
    skippedRowCount:
      payload.mode === "app_only"
        ? sourceRowCount
        : sourceRowCount - (insertSummary?.insertedCount ?? 0),
    tableSchema,
  });
});
