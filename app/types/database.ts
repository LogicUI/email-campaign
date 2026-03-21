import type { Campaign, CampaignRecipient, ImportPreview, PrimitiveFieldValue } from "@/types/campaign";

export type ExternalDatabaseProvider = "supabase" | "postgres";
export type DatabaseSyncMode = "auto" | "manual";

export interface DatabaseSessionConnection {
  provider: ExternalDatabaseProvider;
  connectionString: string;
  label: string;
  profileId?: string;
  syncMode: DatabaseSyncMode;
  lastSyncedAt?: string;
}

export interface DatabaseConnectionProfile {
  id: string;
  provider: ExternalDatabaseProvider;
  label: string;
  displayHost: string;
  displayDatabaseName: string;
  displayProjectRef?: string;
  lastSelectedTable?: string;
  syncMode: DatabaseSyncMode;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  lastSyncedAt?: string;
}

export interface DatabaseSettingsOpenContext {
  source: "general" | "database-import";
  preview?: ImportPreview | null;
}

export interface DatabaseTableRef {
  schema: string;
  name: string;
  displayName: string;
}

export interface DatabaseConnectionTestResponseData {
  reachable: true;
}

export interface DatabaseConnectResponseData {
  connectionProfile: DatabaseConnectionProfile;
  tables: DatabaseTableRef[];
}

export interface DatabaseTablesResponseData {
  tables: DatabaseTableRef[];
}

export interface DatabaseTableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DatabaseTableSchema {
  table: DatabaseTableRef;
  columns: DatabaseTableColumn[];
}

export interface DatabaseDescribeTableResponseData {
  schema: DatabaseTableSchema;
  suggestedMappings: DatabaseImportColumnMapping[];
}

export interface DatabaseImportColumnMapping {
  sourceColumn: string;
  destinationColumn?: string;
}

export interface InferredDatabaseColumn {
  sourceHeader: string;
  suggestedName: string;
  suggestedType: string;
  nullable: boolean;
}

export type DatabaseSaveMode = "app_only" | "existing_table" | "new_table";

export interface DatabaseSaveImportPayload {
  connection?: DatabaseSessionConnection;
  saveName: string;
  preview: ImportPreview;
  mode: DatabaseSaveMode;
  existingTable?: DatabaseTableRef;
  mappings?: DatabaseImportColumnMapping[];
  newTable?: {
    schemaName: string;
    tableName: string;
    columns: InferredDatabaseColumn[];
  };
}

export interface DatabaseSaveImportResponseData {
  savedList: SavedListDetail;
  destinationTableName?: string;
  sourceRowCount: number;
  eligibleRowCount: number;
  insertedCount: number;
  skippedRowCount: number;
  tableSchema?: DatabaseTableSchema | null;
}

export interface SavedListSummary {
  id: string;
  name: string;
  sourceFileLabel: string;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  selectedEmailColumn?: string;
  selectedRecipientColumn?: string;
  destinationTableName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedListRowRecord {
  rowIndex: number;
  email?: string;
  recipient?: string;
  isValid: boolean;
  invalidReason?: string;
  raw: Record<string, unknown>;
  normalizedFields: Record<string, PrimitiveFieldValue>;
}

export interface SavedListDetail extends SavedListSummary {
  schemaSnapshot: {
    headers: string[];
  };
  rows: SavedListRowRecord[];
}

export interface CampaignHistorySummary {
  id: string;
  name: string;
  sourceType: "uploaded_list" | "reused_history" | "manual";
  savedListId?: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt?: string;
}

export interface CampaignHistoryRecipientRecord {
  id: string;
  email: string;
  recipient?: string;
  subject: string;
  body: string;
  fields: Record<string, PrimitiveFieldValue>;
  sendStatus: "draft" | "queued" | "sending" | "sent" | "failed";
  errorMessage?: string;
  providerMessageId?: string;
  sentAt?: string;
}

export interface CampaignHistoryDetail extends CampaignHistorySummary {
  globalSubject: string;
  globalBodyTemplate: string;
  recipients: CampaignHistoryRecipientRecord[];
}

export interface SaveCampaignPayload {
  campaign: Campaign;
  recipients: CampaignRecipient[];
  sourceType: Campaign["sourceType"];
  savedListId?: string;
  sentAt?: string;
  profileId?: string;
}

export interface SaveCampaignResponseData {
  syncedAt: string;
  connectionProfile?: DatabaseConnectionProfile | null;
}

export interface DashboardSummaryResponseData {
  hasSavedData: boolean;
  savedLists: SavedListSummary[];
  campaigns: CampaignHistorySummary[];
  connectionProfiles: DatabaseConnectionProfile[];
}
