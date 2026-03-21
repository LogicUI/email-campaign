"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  exportGoogleSheetResults,
  importGoogleSheet,
  listGoogleDriveFiles,
  listGoogleSheetWorksheets,
} from "@/frontendApi";
import { queryKeys } from "@/tanStack/query-keys";

export function useGoogleDriveFilesQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.google.driveFiles(query),
    queryFn: () => listGoogleDriveFiles(query),
    enabled,
  });
}

export function useGoogleSheetWorksheetsQuery(spreadsheetId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.google.worksheets(spreadsheetId),
    queryFn: () => listGoogleSheetWorksheets(spreadsheetId),
    enabled: enabled && Boolean(spreadsheetId.trim()),
  });
}

export function useImportGoogleSheetMutation() {
  return useMutation({
    mutationFn: importGoogleSheet,
  });
}

export function useExportGoogleSheetResultsMutation() {
  return useMutation({
    mutationFn: exportGoogleSheetResults,
  });
}
