import type { Attachment } from "@/types/gmail";
import type { BulkSendResultItem } from "@/types/api";
import type {
  Campaign,
  CampaignRecipient,
  GenerationLogItem,
  ImportPreview,
} from "@/types/campaign";

export interface CampaignSendProgress {
  total: number;
  completed: number;
  success: number;
  failed: number;
}

export type RecipientStatusView = "unsent" | "sent";

export interface CampaignStoreUiState {
  composeDialogOpen: boolean;
  currentPage: number;
  pageSize: number;
  recipientStatusView: RecipientStatusView;
  isImporting: boolean;
  isSending: boolean;
  isDatabaseSyncing: boolean;
  needsDatabaseSync: boolean;
  lastDatabaseSyncAt?: string;
  lastDatabaseSyncError?: string;
  sendProgress: CampaignSendProgress;
}

export interface CreateCampaignFromPreviewPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
  globalCcEmails?: string[];
  globalAttachments?: Attachment[];
  sourceType?: Campaign["sourceType"];
  savedListId?: string;
}

export interface UpdateGlobalTemplatePayload {
  globalSubject: string;
  globalBodyTemplate: string;
  globalCcEmails?: string[];
  globalAttachments?: Attachment[];
  applyMode: "untouched" | "all";
}

export interface ApplyGeneratedBodyPayload {
  id: string;
  body: string;
  subject?: string;
  reasoning?: string;
  promptVersion?: string;
}

export interface FailRecipientRegenerationPayload {
  id: string;
  errorMessage: string;
  promptVersion?: string;
}

export interface CampaignStoreState {
  campaign: Campaign | null;
  importPreview: ImportPreview | null;
  recipientsById: Record<string, CampaignRecipient>;
  recipientOrder: string[];
  generationLogs: GenerationLogItem[];
  ui: CampaignStoreUiState;
}

export interface CampaignStoreActions {
  setImporting: (value: boolean) => void;
  setImportPreview: (preview: ImportPreview | null) => void;
  hydrateImportPreview: (preview: ImportPreview) => void;
  setSelectedEmailColumn: (column: string) => void;
  setSelectedRecipientColumn: (column: string) => void;
  openComposeDialog: () => void;
  closeComposeDialog: () => void;
  createCampaignFromPreview: (payload: CreateCampaignFromPreviewPayload) => void;
  updateGlobalTemplate: (payload: UpdateGlobalTemplatePayload) => void;
  addManualRecipient: () => void;
  removeRecipient: (id: string) => void;
  updateRecipientEmail: (id: string, email: string) => void;
  updateRecipientBody: (id: string, body: string) => void;
  updateRecipientSubject: (id: string, subject: string) => void;
  updateRecipientCcEmails: (id: string, ccEmails: string[]) => void;
  toggleRecipientChecked: (id: string, checked?: boolean) => void;
  toggleRecipientsChecked: (ids: string[], checked: boolean) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setRecipientStatusView: (view: RecipientStatusView) => void;
  startRecipientRegeneration: (id: string) => void;
  appendGeneratedBodyChunk: (id: string, chunk: string) => void;
  failRecipientRegeneration: (payload: FailRecipientRegenerationPayload) => void;
  applyGeneratedBody: (payload: ApplyGeneratedBodyPayload) => void;
  markRecipientsQueued: (ids: string[]) => void;
  markRecipientsSending: (ids: string[]) => void;
  applySendResults: (results: BulkSendResultItem[]) => void;
  setSending: (value: boolean) => void;
  markDatabaseSyncPending: () => void;
  markDatabaseSyncStarted: () => void;
  markDatabaseSyncSucceeded: (syncedAt: string) => void;
  markDatabaseSyncFailed: (errorMessage: string) => void;
  restoreCampaignFromHistory: (payload: {
    campaign: Campaign;
    recipients: CampaignRecipient[];
  }) => void;
  resetSession: () => void;
}

export type CampaignStore = CampaignStoreState & CampaignStoreActions;
