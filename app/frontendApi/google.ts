"use client";

import { requestApi } from "@/frontendApi/client";
import type {
  GoogleDriveFilesResponseData,
  GoogleSheetExportPayload,
  GoogleSheetExportResponseData,
  GoogleSheetImportPayload,
  GoogleSheetImportResponseData,
  GoogleSheetWorksheetsResponseData,
} from "@/types/google";

export function listGoogleDriveFiles(query?: string) {
  return requestApi<GoogleDriveFilesResponseData>({
    method: "GET",
    url: "/api/google/drive/files",
    params: query?.trim() ? { query } : undefined,
  }).then((data) => data.files);
}

export function listGoogleSheetWorksheets(spreadsheetId: string) {
  return requestApi<GoogleSheetWorksheetsResponseData>({
    method: "GET",
    url: "/api/google/sheets/worksheets",
    params: {
      spreadsheetId,
    },
  });
}

export function importGoogleSheet(payload: GoogleSheetImportPayload) {
  return requestApi<GoogleSheetImportResponseData>({
    method: "POST",
    url: "/api/google/sheets/import",
    data: payload,
  });
}

export function exportGoogleSheetResults(payload: GoogleSheetExportPayload) {
  return requestApi<GoogleSheetExportResponseData>({
    method: "POST",
    url: "/api/google/sheets/export-results",
    data: payload,
  });
}
