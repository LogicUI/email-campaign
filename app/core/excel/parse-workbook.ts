import * as XLSX from "xlsx";

import { detectEmailColumn } from "@/core/excel/detect-email-column";
import { mapPreviewRows } from "@/core/excel/map-preview-rows";
import type { ImportPreview } from "@/types/campaign";

export async function parseWorkbookFile(file: File): Promise<ImportPreview> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("No worksheet found in uploaded file.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const headers = Object.keys(rows[0] ?? {});
  const detection = detectEmailColumn(rows, headers);
  const previewRows = mapPreviewRows({
    rows,
    emailColumn: detection.selected,
  });

  return {
    fileName: file.name,
    sheetName,
    headers,
    rows: previewRows,
    validCount: previewRows.filter((row) => row.isValid).length,
    invalidCount: previewRows.filter((row) => !row.isValid).length,
    candidateEmailColumns: detection.candidates,
    selectedEmailColumn: detection.selected,
  };
}
