"use client";

import { create } from "zustand";

import { buildRecipientDraft } from "@/lib/campaign/build-recipient-draft";
import { mergeTemplate } from "@/lib/campaign/merge-template";
import { createId } from "@/lib/utils/ids";
import type {
  Campaign,
  CampaignRecipient,
  GenerationLogItem,
  ImportPreview,
} from "@/types/campaign";
import type { BulkSendResultItem } from "@/types/api";

export interface CampaignStoreState {
  campaign: Campaign | null;
  importPreview: ImportPreview | null;
  recipientsById: Record<string, CampaignRecipient>;
  recipientOrder: string[];
  generationLogs: GenerationLogItem[];
  ui: {
    composeDialogOpen: boolean;
    currentPage: number;
    pageSize: number;
    isImporting: boolean;
    isSending: boolean;
    sendProgress: {
      total: number;
      completed: number;
      success: number;
      failed: number;
    };
  };
}

export interface CampaignStoreActions {
  setImporting: (value: boolean) => void;
  setImportPreview: (preview: ImportPreview | null) => void;
  setSelectedEmailColumn: (column: string) => void;
  openComposeDialog: () => void;
  closeComposeDialog: () => void;
  createCampaignFromPreview: (payload: {
    name: string;
    globalSubject: string;
    globalBodyTemplate: string;
  }) => void;
  updateGlobalTemplate: (payload: {
    globalSubject: string;
    globalBodyTemplate: string;
    applyMode: "untouched" | "all";
  }) => void;
  updateRecipientBody: (id: string, body: string) => void;
  updateRecipientSubject: (id: string, subject: string) => void;
  toggleRecipientChecked: (id: string, checked?: boolean) => void;
  toggleRecipientsChecked: (ids: string[], checked: boolean) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setRecipientRegenerating: (id: string, value: boolean) => void;
  applyGeneratedBody: (payload: {
    id: string;
    body: string;
    subject?: string;
    promptVersion?: string;
  }) => void;
  markRecipientsQueued: (ids: string[]) => void;
  markRecipientsSending: (ids: string[]) => void;
  applySendResults: (results: BulkSendResultItem[]) => void;
  setSending: (value: boolean) => void;
  resetSession: () => void;
}

export type CampaignStore = CampaignStoreState & CampaignStoreActions;

const initialUiState = {
  composeDialogOpen: false,
  currentPage: 1,
  pageSize: 12,
  isImporting: false,
  isSending: false,
  sendProgress: {
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
  },
};

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaign: null,
  importPreview: null,
  recipientsById: {},
  recipientOrder: [],
  generationLogs: [],
  ui: initialUiState,

  setImporting: (value) =>
    set((state) => ({
      ui: {
        ...state.ui,
        isImporting: value,
      },
    })),

  setImportPreview: (preview) =>
    set({
      importPreview: preview,
    }),

  setSelectedEmailColumn: (column) =>
    set((state) => {
      if (!state.importPreview) {
        return state;
      }

      const updatedRows = state.importPreview.rows.map((row) => {
        const normalizedEmail = String(row.raw[column] ?? "")
          .trim()
          .toLowerCase();

        if (!normalizedEmail) {
          return {
            ...row,
            email: undefined,
            isValid: false,
            invalidReason: "Missing email.",
          };
        }

        const duplicate = state.importPreview?.rows.some(
          (candidate) =>
            candidate.tempId !== row.tempId &&
            String(candidate.raw[column] ?? "").trim().toLowerCase() === normalizedEmail,
        );

        if (duplicate) {
          return {
            ...row,
            email: normalizedEmail,
            isValid: false,
            invalidReason: "Duplicate email in upload.",
          };
        }

        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(normalizedEmail);

        return {
          ...row,
          email: normalizedEmail,
          isValid: valid,
          invalidReason: valid ? undefined : "Invalid email format.",
        };
      });

      return {
        importPreview: {
          ...state.importPreview,
          selectedEmailColumn: column,
          rows: updatedRows,
          validCount: updatedRows.filter((row) => row.isValid).length,
          invalidCount: updatedRows.filter((row) => !row.isValid).length,
        },
      };
    }),

  openComposeDialog: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        composeDialogOpen: true,
      },
    })),

  closeComposeDialog: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        composeDialogOpen: false,
      },
    })),

  createCampaignFromPreview: ({ name, globalSubject, globalBodyTemplate }) => {
    const preview = get().importPreview;

    if (!preview) {
      return;
    }

    const validRows = preview.rows.filter((row) => row.isValid);
    const recipients = validRows.map((row) =>
      buildRecipientDraft({
        row,
        globalSubject,
        globalBodyTemplate,
      }),
    );

    set({
      campaign: {
        id: createId("campaign"),
        name,
        globalSubject,
        globalBodyTemplate,
        createdAt: new Date().toISOString(),
        importedFileName: preview.fileName ?? "upload",
        importedSheetName: preview.sheetName,
        detectedEmailColumn: preview.selectedEmailColumn,
        totalRows: preview.rows.length,
        validRows: validRows.length,
        invalidRows: preview.rows.length - validRows.length,
      },
      recipientsById: Object.fromEntries(recipients.map((recipient) => [recipient.id, recipient])),
      recipientOrder: recipients.map((recipient) => recipient.id),
      ui: {
        ...get().ui,
        composeDialogOpen: false,
        currentPage: 1,
      },
    });
  },

  updateGlobalTemplate: ({ globalSubject, globalBodyTemplate, applyMode }) =>
    set((state) => {
      if (!state.campaign) {
        return state;
      }

      const recipientsById = Object.fromEntries(
        Object.entries(state.recipientsById).map(([id, recipient]) => {
          const shouldApply =
            applyMode === "all" ||
            (recipient.bodySource === "global-template" &&
              recipient.manualEditsSinceGenerate === false);

          if (!shouldApply) {
            return [id, recipient];
          }

          return [
            id,
            {
              ...recipient,
              subject: mergeTemplate(globalSubject, recipient.fields),
              body: mergeTemplate(globalBodyTemplate, recipient.fields),
              bodySource: "global-template" as const,
            },
          ];
        }),
      );

      return {
        campaign: {
          ...state.campaign,
          globalSubject,
          globalBodyTemplate,
        },
        recipientsById,
      };
    }),

  updateRecipientBody: (id, body) =>
    set((state) => ({
      recipientsById: {
        ...state.recipientsById,
        [id]: {
          ...state.recipientsById[id],
          body,
          bodySource: "manual",
          manualEditsSinceGenerate: true,
        },
      },
    })),

  updateRecipientSubject: (id, subject) =>
    set((state) => ({
      recipientsById: {
        ...state.recipientsById,
        [id]: {
          ...state.recipientsById[id],
          subject,
        },
      },
    })),

  toggleRecipientChecked: (id, checked) =>
    set((state) => ({
      recipientsById: {
        ...state.recipientsById,
        [id]: {
          ...state.recipientsById[id],
          checked: checked ?? !state.recipientsById[id]?.checked,
        },
      },
    })),

  toggleRecipientsChecked: (ids, checked) =>
    set((state) => ({
      recipientsById: ids.reduce<Record<string, CampaignRecipient>>((accumulator, id) => {
        accumulator[id] = {
          ...state.recipientsById[id],
          checked,
        };
        return accumulator;
      }, { ...state.recipientsById }),
    })),

  setCurrentPage: (page) =>
    set((state) => ({
      ui: {
        ...state.ui,
        currentPage: Math.max(page, 1),
      },
    })),

  setPageSize: (pageSize) =>
    set((state) => ({
      ui: {
        ...state.ui,
        pageSize,
        currentPage: 1,
      },
    })),

  setRecipientRegenerating: (id, value) =>
    set((state) => ({
      recipientsById: {
        ...state.recipientsById,
        [id]: {
          ...state.recipientsById[id],
          isRegenerating: value,
          errorMessage: value ? undefined : state.recipientsById[id]?.errorMessage,
        },
      },
    })),

  applyGeneratedBody: ({ id, body, subject, promptVersion = "v1" }) =>
    set((state) => {
      const existing = state.recipientsById[id];

      if (!existing) {
        return state;
      }

      const nextLog: GenerationLogItem = {
        id: createId("genlog"),
        recipientId: id,
        createdAt: new Date().toISOString(),
        promptVersion,
        inputBody: existing.body,
        outputBody: body,
        status: "success",
      };

      return {
        recipientsById: {
          ...state.recipientsById,
          [id]: {
            ...existing,
            body,
            subject: subject ?? existing.subject,
            bodySource: "ai-generated",
            lastGeneratedBody: body,
            lastGenerationAt: new Date().toISOString(),
            manualEditsSinceGenerate: false,
            isRegenerating: false,
            errorMessage: undefined,
          },
        },
        generationLogs: [nextLog, ...state.generationLogs].slice(0, 50),
      };
    }),

  markRecipientsQueued: (ids) =>
    set((state) => ({
      recipientsById: ids.reduce<Record<string, CampaignRecipient>>((accumulator, id) => {
        accumulator[id] = {
          ...state.recipientsById[id],
          status: "queued",
          isSending: false,
          errorMessage: undefined,
        };
        return accumulator;
      }, { ...state.recipientsById }),
      ui: {
        ...state.ui,
        sendProgress: {
          total: ids.length,
          completed: 0,
          success: 0,
          failed: 0,
        },
      },
    })),

  markRecipientsSending: (ids) =>
    set((state) => ({
      recipientsById: ids.reduce<Record<string, CampaignRecipient>>((accumulator, id) => {
        accumulator[id] = {
          ...state.recipientsById[id],
          status: "sending",
          isSending: true,
          lastSendAttemptAt: new Date().toISOString(),
        };
        return accumulator;
      }, { ...state.recipientsById }),
    })),

  applySendResults: (results) =>
    set((state) => {
      const nextRecipients = { ...state.recipientsById };
      let success = 0;
      let failed = 0;

      results.forEach((result) => {
        const current = nextRecipients[result.recipientId];

        if (!current) {
          return;
        }

        const sent = result.status === "sent";

        if (sent) {
          success += 1;
        } else {
          failed += 1;
        }

        nextRecipients[result.recipientId] = {
          ...current,
          sent,
          status: sent ? "sent" : "failed",
          isSending: false,
          checked: sent ? false : current.checked,
          lastResendId: result.resendId,
          errorMessage: result.errorMessage,
        };
      });

      return {
        recipientsById: nextRecipients,
        ui: {
          ...state.ui,
          isSending: false,
          sendProgress: {
            total: state.ui.sendProgress.total,
            completed: results.length,
            success,
            failed,
          },
        },
      };
    }),

  setSending: (value) =>
    set((state) => ({
      ui: {
        ...state.ui,
        isSending: value,
      },
    })),

  resetSession: () =>
    set({
      campaign: null,
      importPreview: null,
      recipientsById: {},
      recipientOrder: [],
      generationLogs: [],
      ui: initialUiState,
    }),
}));
