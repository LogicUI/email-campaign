import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

export async function POST(request: Request) {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = saveImportToDatabaseRequestSchema.parse(await request.json());
    const sourceRowCount = body.preview.rows.length;
    const eligibleRowCount = body.preview.rows.filter((row) => row.isValid).length;
    let destinationTableName: string | undefined;
    let connectionProfileId: string | undefined;
    let insertSummary: { insertedCount: number } | undefined;
    let tableSchema: DatabaseTableSchema | null = null;

    if (body.mode !== "app_only") {
      if (!body.connection) {
        throw new Error("An active database connection is required.");
      }

      const profileMetadata = normalizeConnectionProfile(body.connection);
      const profile = await upsertConnectionProfile({
        userId: auth.userId,
        provider: body.connection.provider,
        label: profileMetadata.label,
        displayHost: profileMetadata.displayHost,
        displayDatabaseName: profileMetadata.displayDatabaseName,
        displayProjectRef: profileMetadata.displayProjectRef,
        lastSelectedTable:
          body.existingTable?.displayName ??
          (body.newTable ? `${body.newTable.schemaName}.${body.newTable.tableName}` : undefined),
      });
      connectionProfileId = profile.id;

      if (body.mode === "existing_table") {
        if (!body.existingTable) {
          throw new Error("Select a destination table before saving.");
        }

        const mappings =
          body.mappings && body.mappings.length > 0
            ? body.mappings
            : buildSuggestedMappings({
                headers: body.preview.headers,
                schema: await describePostgresTable({
                  connection: body.connection,
                  schema: body.existingTable.schema,
                  table: body.existingTable.name,
                }),
              });

        insertSummary = await insertRowsIntoPostgresTable({
          connection: body.connection,
          schema: body.existingTable.schema,
          table: body.existingTable.name,
          mappings,
          preview: body.preview,
        });
        destinationTableName = body.existingTable.displayName;
        tableSchema = await describePostgresTable({
          connection: body.connection,
          schema: body.existingTable.schema,
          table: body.existingTable.name,
        });
      }

      if (body.mode === "new_table") {
        if (!body.newTable) {
          throw new Error("New table details are required.");
        }

        tableSchema = await createPostgresTable({
          connection: body.connection,
          schema: body.newTable.schemaName,
          tableName: body.newTable.tableName,
          columns:
            body.newTable.columns.length > 0
              ? body.newTable.columns
              : inferPostgresColumns(body.preview),
        });

        if (!tableSchema) {
          throw new Error("The new table could not be created.");
        }

        const createdTableSchema = tableSchema;

        const mappings = body.mappings?.length
          ? body.mappings
          : body.preview.headers.map((header) => ({
              sourceColumn: header,
              destinationColumn:
                createdTableSchema.columns.find(
                  (column) =>
                    column.name.toLowerCase() ===
                    header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                )?.name ?? undefined,
            }));

        insertSummary = await insertRowsIntoPostgresTable({
          connection: body.connection,
          schema: body.newTable.schemaName,
          table: createdTableSchema.table.name,
          mappings,
          preview: body.preview,
        });
        destinationTableName = createdTableSchema.table.displayName;
      }
    }

    const savedList = await saveImportPreviewAsList({
      userId: auth.userId,
      preview: body.preview,
      name: body.saveName,
      destinationTableName,
      connectionProfileId,
    });

    return NextResponse.json({
      ok: true,
      data: {
        savedList,
        destinationTableName,
        sourceRowCount,
        eligibleRowCount,
        insertedCount: insertSummary?.insertedCount ?? 0,
        skippedRowCount:
          body.mode === "app_only"
            ? sourceRowCount
            : sourceRowCount - (insertSummary?.insertedCount ?? 0),
        tableSchema,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? getZodErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "Unable to save the imported rows.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
