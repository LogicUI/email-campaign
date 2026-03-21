import type { ImportPreview } from "@/types/campaign";

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleSheetWorksheet {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface GoogleDriveFilesResponseData {
  files: GoogleDriveFileItem[];
}

export interface GoogleSheetWorksheetsResponseData {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  worksheets: GoogleSheetWorksheet[];
}

export interface GoogleSheetImportPayload {
  spreadsheetId: string;
  worksheetTitle: string;
}

export interface GoogleSheetImportResponseData {
  preview: ImportPreview;
}

export interface GoogleSheetExportPayload {
  spreadsheetId: string;
  worksheetTitle?: string;
  campaignName: string;
  senderEmail: string;
  globalSubject: string;
  recipients: Array<{
    id: string;
    rowIndex: number;
    email: string;
    recipient?: string;
    subject: string;
    status: string;
    errorMessage?: string;
    providerMessageId?: string;
    sourceFileName?: string;
    sourceSheetName?: string;
    lastSendAttemptAt?: string;
  }>;
}

export interface GoogleSheetExportResponseData {
  spreadsheetId: string;
  worksheetTitle: string;
  updatedRange?: string;
  spreadsheetUrl: string;
  appendedRowCount: number;
}
