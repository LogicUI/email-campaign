"use client";

import { detectEmailColumn } from "@/core/excel/detect-email-column";
import { detectRecipientColumn } from "@/core/excel/detect-recipient-column";
import { mapPreviewRows } from "@/core/excel/map-preview-rows";
import type {
  ImportPreview,
  ImportSourceFile,
  ImportSourceRow,
} from "@/types/campaign";

/**
 * Collects a stable ordered header list from heterogeneous source rows.
 *
 * This exists because merged workbook imports can contain rows with slightly different
 * key sets. The preview UI still needs one deterministic header list for column
 * detection and mapping, so we preserve first-seen order while deduplicating names.
 *
 * @param sourceRows Raw imported rows before preview normalization.
 * @returns Ordered unique header list discovered across all rows.
 */
function uniqueHeaders(sourceRows: ImportSourceRow[]) {
  const seenHeaders = new Set<string>();
  const headers: string[] = [];

  sourceRows.forEach((row) => {
    Object.keys(row.raw).forEach((header) => {
      if (!seenHeaders.has(header)) {
        seenHeaders.add(header);
        headers.push(header);
      }
    });
  });

  return headers;
}

/**
 * Builds the compact file label shown in the import preview.
 *
 * This exists so multi-file uploads can still display one readable summary instead
 * of dumping every file name into the campaign metadata.
 *
 * @param sourceFiles Imported workbook file descriptors.
 * @returns Single display string, or `undefined` when no files were provided.
 */
function summarizeFileNames(sourceFiles: ImportSourceFile[]) {
  if (sourceFiles.length === 0) {
    return undefined;
  }

  if (sourceFiles.length === 1) {
    return sourceFiles[0].fileName;
  }

  return `${sourceFiles[0].fileName} + ${sourceFiles.length - 1} more`;
}

/**
 * Creates the canonical import preview model from raw uploaded workbook rows.
 *
 * This is the central normalization step for spreadsheet uploads. It chooses email
 * and recipient columns, maps raw rows into preview rows, and computes the summary
 * counts the rest of the campaign workflow depends on.
 *
 * @param params.preferredEmailColumn Optional user-selected email column override.
 * @param params.preferredRecipientColumn Optional user-selected recipient column override.
 * @param params.savedListId Optional source saved-list id when hydrating from persistence.
 * @param params.sourceFiles Uploaded source file descriptors.
 * @param params.sourceRows Raw imported rows plus source metadata.
 * @returns Fully built import preview used by the review and compose flows.
 */
export function buildImportPreview(params: {
  preferredEmailColumn?: string;
  preferredRecipientColumn?: string;
  savedListId?: string;
  sourceFiles: ImportSourceFile[];
  sourceRows: ImportSourceRow[];
}): ImportPreview {
  const {
    preferredEmailColumn,
    preferredRecipientColumn,
    savedListId,
    sourceFiles,
    sourceRows,
  } = params;
  const headers = uniqueHeaders(sourceRows);
  const rawRows = sourceRows.map((row) => row.raw);
  const emailDetection = detectEmailColumn(rawRows, headers);
  const selectedEmailColumn =
    preferredEmailColumn && headers.includes(preferredEmailColumn)
      ? preferredEmailColumn
      : emailDetection.selected;
  const recipientDetection = detectRecipientColumn(rawRows, headers, selectedEmailColumn);
  const selectedRecipientColumn =
    preferredRecipientColumn &&
    headers.includes(preferredRecipientColumn) &&
    preferredRecipientColumn !== selectedEmailColumn
      ? preferredRecipientColumn
      : recipientDetection.selected;
  const previewRows = mapPreviewRows({
    rows: sourceRows,
    emailColumn: selectedEmailColumn,
    recipientColumn: selectedRecipientColumn,
  });

  return {
    fileName: summarizeFileNames(sourceFiles),
    sheetName: sourceFiles.length === 1 ? sourceFiles[0].sheetName : undefined,
    savedListId,
    sourceFiles,
    sourceRows,
    headers,
    rows: previewRows,
    validCount: previewRows.filter((row) => row.isValid).length,
    invalidCount: previewRows.filter((row) => !row.isValid).length,
    candidateEmailColumns: emailDetection.candidates,
    candidateRecipientColumns: recipientDetection.candidates,
    selectedEmailColumn,
    selectedRecipientColumn,
  };
}

/**
 * Rebuilds one preview from multiple existing previews.
 *
 * This exists for multi-upload flows where the user keeps adding files on top of an
 * existing import session. Rather than preserving separate previews, we flatten the
 * source files and rows back into one canonical preview and re-run detection logic.
 *
 * @param previews Existing previews that should be merged.
 * @param preferredColumns Optional persisted column choices to preserve during merge.
 * @returns Combined import preview.
 */
export function mergeImportPreviews(
  previews: ImportPreview[],
  preferredColumns?: {
    emailColumn?: string;
    recipientColumn?: string;
  },
) {
  return buildImportPreview({
    preferredEmailColumn: preferredColumns?.emailColumn,
    preferredRecipientColumn: preferredColumns?.recipientColumn,
    savedListId: previews.find((preview) => preview.savedListId)?.savedListId,
    sourceFiles: previews.flatMap((preview) => preview.sourceFiles),
    sourceRows: previews.flatMap((preview) => preview.sourceRows),
  });
}
