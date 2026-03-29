import type { Attachment } from "./gmail";

export type PrimitiveFieldValue = string | number | boolean | null;

export type SendStatus =
  | "draft"
  | "ready"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "skipped";

export interface Campaign {
  id: string;
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  globalBodyEditorJson?: string; // TipTap JSON for rich text editing (optional for backward compatibility)
  globalCcEmails?: string[];
  globalAttachments?: Attachment[];
  createdAt: string;
  sourceType:
    | "uploaded_list"
    | "reused_history"
    | "manual"
    | "google_sheet"
    | "database_table";
  savedListId?: string;
  importedFileName: string;
  importedSheetName?: string;
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  databaseConnectionLabel?: string;
  databaseTableName?: string;
  detectedEmailColumn?: string;
  detectedRecipientColumn?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface CampaignRecipient {
  id: string;
  rowIndex: number;
  source: "imported" | "manual";
  email: string;
  ccEmails?: string[];
  attachments?: Attachment[];
  recipient?: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  subject: string;
  body: string;
  bodyEditorJson?: string; // TipTap JSON for rich text editing (optional for backward compatibility)
  checked: boolean;
  sent: boolean;
  status: SendStatus;
  fields: Record<string, PrimitiveFieldValue>;
  bodySource: "global-template" | "ai-generated" | "manual";
  lastGeneratedBody?: string;
  lastGenerationAt?: string;
  manualEditsSinceGenerate: boolean;
  isRegenerating: boolean;
  lastGenerationReasoning?: string;
  isSending: boolean;
  lastSendAttemptAt?: string;
  lastProviderMessageId?: string;
  errorMessage?: string;
}

export interface ImportSourceFile {
  fileName: string;
  sheetName?: string;
}

export interface ImportSourceRow {
  raw: Record<string, unknown>;
  sourceFileName: string;
  sourceSheetName?: string;
  originalRowIndex: number;
}

export interface ImportPreviewRow {
  tempId: string;
  rowIndex: number;
  email?: string;
  recipient?: string;
  sourceFileName: string;
  sourceSheetName?: string;
  isValid: boolean;
  invalidReason?: string;
  fields: Record<string, PrimitiveFieldValue>;
  raw: Record<string, unknown>;
}

export interface ImportPreview {
  fileName?: string;
  sheetName?: string;
  savedListId?: string;
  sourceType?: "uploaded_file" | "google_sheet" | "database_table";
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  databaseConnectionLabel?: string;
  databaseTableName?: string;
  sourceFiles: ImportSourceFile[];
  sourceRows: ImportSourceRow[];
  headers: string[];
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
  candidateEmailColumns: string[];
  candidateRecipientColumns: string[];
  selectedEmailColumn?: string;
  selectedRecipientColumn?: string;
}

export interface SavedWorkbookFileRecord {
  fileName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  dataBase64: string;
}

export interface SavedWorkbookRecord {
  version: 2;
  savedAt: string;
  files: SavedWorkbookFileRecord[];
}

export interface LegacySavedWorkbookRecord {
  version: 1;
  fileName: string;
  mimeType: string;
  size: number;
  savedAt: string;
  dataBase64: string;
}

export interface GenerationLogItem {
  id: string;
  recipientId: string;
  createdAt: string;
  promptVersion: string;
  inputBody: string;
  outputBody?: string;
  status: "success" | "failed";
  errorMessage?: string;
}
