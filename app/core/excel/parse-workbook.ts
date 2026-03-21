import * as XLSX from "xlsx";

import { buildImportPreview } from "@/core/excel/build-import-preview";
import type { ImportPreview } from "@/types/campaign";

/**
 * Parses an uploaded workbook file into the app's canonical import preview shape.
 *
 * This exists as the boundary between the browser `File` API and the spreadsheet
 * workflow. It reads the first worksheet, converts it into row objects, attaches
 * source metadata, and delegates to `buildImportPreview` for validation/detection.
 *
 * @param file Uploaded workbook file selected by the user.
 * @returns Import preview derived from the first worksheet in the file.
 */
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

  return buildImportPreview({
    sourceFiles: [
      {
        fileName: file.name,
        sheetName,
      },
    ],
    sourceRows: rows.map((row, index) => ({
      raw: row,
      sourceFileName: file.name,
      sourceSheetName: sheetName,
      originalRowIndex: index + 2,
    })),
  });
}
