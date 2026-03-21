import { and, desc, eq } from "drizzle-orm";

import { createId } from "@/core/utils/ids";
import { getReadyAppDatabase } from "@/core/persistence/app-db";
import { savedListRows, savedLists } from "@/core/persistence/schema";
import type {
  SavedListDetail,
  SavedListRowRecord,
  SavedListSummary,
} from "@/types/database";
import type { ImportPreview } from "@/types/campaign";

/**
 * Normalizes a raw saved-list row into the summary shape used by dashboard cards.
 *
 * @param row Raw `saved_lists` row from the app database.
 * @returns Lightweight saved-list summary for listing screens.
 */
function mapSavedListSummary(row: typeof savedLists.$inferSelect): SavedListSummary {
  return {
    id: row.id,
    name: row.name,
    sourceFileLabel: row.sourceFileLabel,
    rowCount: row.rowCount,
    validRowCount: row.validRowCount,
    invalidRowCount: row.invalidRowCount,
    selectedEmailColumn: row.selectedEmailColumn ?? undefined,
    selectedRecipientColumn: row.selectedRecipientColumn ?? undefined,
    destinationTableName: row.destinationTableName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Normalizes a raw saved-list item row into the reusable detail shape.
 *
 * This keeps JSON field casting and `null` to `undefined` normalization in one place
 * before the saved list is hydrated back into the workspace.
 *
 * @param row Raw `saved_list_rows` record from the app database.
 * @returns Saved row record ready for API/UI consumers.
 */
function mapSavedListItemRow(row: typeof savedListRows.$inferSelect): SavedListRowRecord {
  return {
    rowIndex: row.rowIndex,
    email: row.email ?? undefined,
    recipient: row.recipient ?? undefined,
    isValid: row.isValid,
    invalidReason: row.invalidReason ?? undefined,
    raw: row.rawJson as Record<string, unknown>,
    normalizedFields: row.normalizedFieldsJson as SavedListRowRecord["normalizedFields"],
  };
}

/**
 * Returns all saved recipient lists for a user.
 *
 * The dashboard uses this to show reusable imported lists in reverse chronological
 * order so the newest uploads appear first.
 *
 * @param userId Stable app-owned user identifier.
 * @returns Saved-list summaries for the current user.
 */
export async function listSavedListsForUser(userId: string) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return [] as SavedListSummary[];
  }

  const rows = await db
    .select()
    .from(savedLists)
    .where(eq(savedLists.userId, userId))
    .orderBy(desc(savedLists.updatedAt));

  return rows.map(mapSavedListSummary);
}

/**
 * Loads one saved recipient list together with its persisted rows.
 *
 * This powers the "open saved list" and "reuse list" flows by reconstructing the
 * full dataset the user originally imported, including valid/invalid row state and
 * the selected email/recipient columns.
 *
 * @param userId Stable app-owned user identifier used for ownership checks.
 * @param savedListId Identifier of the saved list to retrieve.
 * @returns Full saved-list detail, or `null` if the list does not exist for the user.
 */
export async function getSavedListById(userId: string, savedListId: string) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return null;
  }

  const summaryRows = await db
    .select()
    .from(savedLists)
    .where(and(eq(savedLists.userId, userId), eq(savedLists.id, savedListId)))
    .limit(1);

  const summary = summaryRows[0];

  if (!summary) {
    return null;
  }

  const rowItems = await db
    .select()
    .from(savedListRows)
    .where(eq(savedListRows.savedListId, savedListId))
    .orderBy(savedListRows.rowIndex);

  return {
    ...mapSavedListSummary(summary),
    schemaSnapshot: summary.schemaSnapshotJson as SavedListDetail["schemaSnapshot"],
    rows: rowItems.map(mapSavedListItemRow),
  } satisfies SavedListDetail;
}

/**
 * Persists the current import preview as a reusable saved recipient list.
 *
 * This exists so a one-time spreadsheet upload can become a canonical list in the
 * app database. Both the summary metadata and each imported row are stored, allowing
 * the list to be reopened later without re-uploading the original workbook.
 *
 * @param params.userId Stable app-owned user identifier.
 * @param params.preview Current parsed import preview.
 * @param params.name User-chosen name for the saved list.
 * @param params.destinationTableName Optional external destination table linked to the save.
 * @param params.connectionProfileId Optional connection profile that was used.
 * @returns The freshly persisted saved-list detail.
 */
export async function saveImportPreviewAsList(params: {
  userId: string;
  preview: ImportPreview;
  name: string;
  destinationTableName?: string;
  connectionProfileId?: string;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    throw new Error("APP_DATABASE_URL is not configured.");
  }

  const id = createId("savedlist");
  const now = new Date().toISOString();
  const sourceFileLabel =
    params.preview.sourceFiles.length === 1
      ? params.preview.sourceFiles[0]?.fileName ?? "upload"
      : `${params.preview.sourceFiles[0]?.fileName ?? "upload"} + ${params.preview.sourceFiles.length - 1} more`;

  await db.insert(savedLists).values({
    id,
    userId: params.userId,
    name: params.name,
    sourceFileLabel,
    rowCount: params.preview.rows.length,
    validRowCount: params.preview.validCount,
    invalidRowCount: params.preview.invalidCount,
    selectedEmailColumn: params.preview.selectedEmailColumn ?? null,
    selectedRecipientColumn: params.preview.selectedRecipientColumn ?? null,
    schemaSnapshotJson: { headers: params.preview.headers },
    sourceConnectionProfileId: params.connectionProfileId ?? null,
    destinationTableName: params.destinationTableName ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (params.preview.rows.length > 0) {
    await db.insert(savedListRows).values(
      params.preview.rows.map((row) => ({
        id: createId("savedrow"),
        savedListId: id,
        rowIndex: row.rowIndex,
        email: row.email ?? null,
        recipient: row.recipient ?? null,
        isValid: row.isValid,
        invalidReason: row.invalidReason ?? null,
        rawJson: row.raw,
        normalizedFieldsJson: row.fields,
        createdAt: now,
      })),
    );
  }

  return getSavedListById(params.userId, id);
}
