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
  createdAt: string;
  importedFileName: string;
  importedSheetName?: string;
  detectedEmailColumn?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface CampaignRecipient {
  id: string;
  rowIndex: number;
  source: "imported" | "manual";
  email: string;
  subject: string;
  body: string;
  checked: boolean;
  sent: boolean;
  status: SendStatus;
  fields: Record<string, PrimitiveFieldValue>;
  bodySource: "global-template" | "ai-generated" | "manual";
  lastGeneratedBody?: string;
  lastGenerationAt?: string;
  manualEditsSinceGenerate: boolean;
  isRegenerating: boolean;
  regenerationPhase: "idle" | "streaming" | "finalizing";
  streamOriginalBody?: string;
  lastGenerationReasoning?: string;
  isSending: boolean;
  lastSendAttemptAt?: string;
  lastProviderMessageId?: string;
  errorMessage?: string;
}

export interface ImportPreviewRow {
  tempId: string;
  rowIndex: number;
  email?: string;
  isValid: boolean;
  invalidReason?: string;
  fields: Record<string, PrimitiveFieldValue>;
  raw: Record<string, unknown>;
}

export interface ImportPreview {
  fileName?: string;
  sheetName?: string;
  headers: string[];
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
  candidateEmailColumns: string[];
  selectedEmailColumn?: string;
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
