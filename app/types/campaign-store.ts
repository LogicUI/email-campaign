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

export interface CampaignStoreUiState {
  composeDialogOpen: boolean;
  currentPage: number;
  pageSize: number;
  isImporting: boolean;
  isSending: boolean;
  sendProgress: CampaignSendProgress;
}

export interface CreateCampaignFromPreviewPayload {
  name: string;
  globalSubject: string;
  globalBodyTemplate: string;
}

export interface UpdateGlobalTemplatePayload {
  globalSubject: string;
  globalBodyTemplate: string;
  applyMode: "untouched" | "all";
}

export interface ApplyGeneratedBodyPayload {
  id: string;
  body: string;
  subject?: string;
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
  setSelectedEmailColumn: (column: string) => void;
  openComposeDialog: () => void;
  closeComposeDialog: () => void;
  createCampaignFromPreview: (payload: CreateCampaignFromPreviewPayload) => void;
  updateGlobalTemplate: (payload: UpdateGlobalTemplatePayload) => void;
  updateRecipientBody: (id: string, body: string) => void;
  updateRecipientSubject: (id: string, subject: string) => void;
  toggleRecipientChecked: (id: string, checked?: boolean) => void;
  toggleRecipientsChecked: (ids: string[], checked: boolean) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setRecipientRegenerating: (id: string, value: boolean) => void;
  applyGeneratedBody: (payload: ApplyGeneratedBodyPayload) => void;
  markRecipientsQueued: (ids: string[]) => void;
  markRecipientsSending: (ids: string[]) => void;
  applySendResults: (results: BulkSendResultItem[]) => void;
  setSending: (value: boolean) => void;
  resetSession: () => void;
}

export type CampaignStore = CampaignStoreState & CampaignStoreActions;
