"use client";

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import { buildRecipientDraft } from "@/core/campaign/build-recipient-draft";
import { mergeTemplate } from "@/core/campaign/merge-template";
import { buildImportPreview } from "@/core/excel/build-import-preview";
import { createId } from "@/core/utils/ids";
import type {
  CampaignStore,
  CampaignStoreUiState,
} from "@/types/campaign-store";
import type {
  CampaignRecipient,
  GenerationLogItem,
  ImportPreview,
} from "@/types/campaign";

const initialUiState: CampaignStoreUiState = {
  composeDialogOpen: false,
  currentPage: 1,
  pageSize: 12,
  recipientStatusView: "unsent",
  isImporting: false,
  isSending: false,
  isDatabaseSyncing: false,
  needsDatabaseSync: false,
  sendProgress: {
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
  },
};

function rebuildImportPreview(
  preview: ImportPreview,
  params: {
    emailColumn?: string;
    recipientColumn?: string;
  },
) {
  return buildImportPreview({
    preferredEmailColumn: params.emailColumn || undefined,
    preferredRecipientColumn: params.recipientColumn || undefined,
    savedListId: preview.savedListId,
    sourceType: preview.sourceType,
    googleSpreadsheetId: preview.googleSpreadsheetId,
    googleSpreadsheetUrl: preview.googleSpreadsheetUrl,
    databaseConnectionLabel: preview.databaseConnectionLabel,
    databaseTableName: preview.databaseTableName,
    sourceFiles: preview.sourceFiles,
    sourceRows: preview.sourceRows,
  });
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    devtools((set, get) => ({
      campaign: null,
      importPreview: null,
      recipientsById: {},
      recipientOrder: [],
      generationLogs: [],
      ui: initialUiState,

      setImporting: (value) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isImporting: value,
            },
          }),
          false,
          "campaign/setImporting",
        ),

      setImportPreview: (preview) =>
        set(
          {
            importPreview: preview,
          },
          false,
          "campaign/setImportPreview",
        ),

      hydrateImportPreview: (preview) =>
        set(
          {
            campaign: null,
            importPreview: preview,
            recipientsById: {},
            recipientOrder: [],
            generationLogs: [],
            ui: {
              ...initialUiState,
            },
          },
          false,
          "campaign/hydrateImportPreview",
        ),

      setSelectedEmailColumn: (column) =>
        set(
          (state) => {
            if (!state.importPreview) {
              return state;
            }

            return {
              importPreview: rebuildImportPreview(state.importPreview, {
                emailColumn: column,
                recipientColumn:
                  state.importPreview.selectedRecipientColumn === column
                    ? undefined
                    : state.importPreview.selectedRecipientColumn,
              }),
            };
          },
          false,
          "campaign/setSelectedEmailColumn",
        ),

      setSelectedRecipientColumn: (column) =>
        set(
          (state) => {
            if (!state.importPreview) {
              return state;
            }

            return {
              importPreview: rebuildImportPreview(state.importPreview, {
                emailColumn: state.importPreview.selectedEmailColumn,
                recipientColumn:
                  column && column !== state.importPreview.selectedEmailColumn
                    ? column
                    : undefined,
              }),
            };
          },
          false,
          "campaign/setSelectedRecipientColumn",
        ),

      openComposeDialog: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              composeDialogOpen: true,
            },
          }),
          false,
          "campaign/openComposeDialog",
        ),

      closeComposeDialog: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              composeDialogOpen: false,
            },
          }),
          false,
          "campaign/closeComposeDialog",
        ),

      createCampaignFromPreview: ({ name, globalSubject, globalBodyTemplate, globalCcEmails, globalAttachments, sourceType, savedListId }) => {
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
            globalCcEmails,
            globalAttachments,
          }),
        );

        set(
          {
            campaign: {
              id: createId("campaign"),
              name,
              globalSubject,
              globalBodyTemplate,
              globalCcEmails,
              globalAttachments,
              createdAt: new Date().toISOString(),
              sourceType:
                sourceType ??
                (preview.googleSpreadsheetId
                  ? "google_sheet"
                  : preview.databaseTableName
                    ? "database_table"
                    : savedListId || preview.savedListId
                      ? "uploaded_list"
                      : "manual"),
              savedListId: savedListId ?? preview.savedListId,
              importedFileName: preview.fileName ?? "upload",
              importedSheetName: preview.sheetName,
              googleSpreadsheetId: preview.googleSpreadsheetId,
              googleSpreadsheetUrl: preview.googleSpreadsheetUrl,
              databaseConnectionLabel: preview.databaseConnectionLabel,
              databaseTableName: preview.databaseTableName,
              detectedEmailColumn: preview.selectedEmailColumn,
              detectedRecipientColumn: preview.selectedRecipientColumn,
              totalRows: preview.rows.length,
              validRows: validRows.length,
              invalidRows: preview.rows.length - validRows.length,
            },
            recipientsById: Object.fromEntries(
              recipients.map((recipient) => [recipient.id, recipient]),
            ),
            recipientOrder: recipients.map((recipient) => recipient.id),
            ui: {
              ...get().ui,
              composeDialogOpen: false,
              currentPage: 1,
              needsDatabaseSync: false,
              isDatabaseSyncing: false,
              lastDatabaseSyncAt: undefined,
              lastDatabaseSyncError: undefined,
            },
          },
          false,
          "campaign/createCampaignFromPreview",
        );
      },

      updateGlobalTemplate: ({ globalSubject, globalBodyTemplate, globalCcEmails, globalAttachments, applyMode }) =>
        set(
          (state) => {
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
                    ccEmails: globalCcEmails,
                    attachments: globalAttachments,
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
                globalCcEmails,
                globalAttachments,
              },
              recipientsById,
              ui: {
                ...state.ui,
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
              },
            };
          },
          false,
          "campaign/updateGlobalTemplate",
        ),

      addManualRecipient: () =>
        set(
          (state) => {
            if (!state.campaign) {
              return state;
            }

            const recipientId = createId("recipient");
            const nextRecipient: CampaignRecipient = {
              id: recipientId,
              rowIndex: 0,
              source: "manual",
              email: "",
              ccEmails: state.campaign.globalCcEmails,
              attachments: state.campaign.globalAttachments,
              subject: mergeTemplate(state.campaign.globalSubject, {}),
              body: mergeTemplate(state.campaign.globalBodyTemplate, {}),
              checked: true,
              sent: false,
              status: "draft",
              fields: {},
              bodySource: "manual",
              manualEditsSinceGenerate: false,
              isRegenerating: false,
              regenerationPhase: "idle",
              isSending: false,
            };

            return {
              recipientsById: {
                [recipientId]: nextRecipient,
                ...state.recipientsById,
              },
              recipientOrder: [recipientId, ...state.recipientOrder],
              ui: {
                ...state.ui,
                currentPage: 1,
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
              },
            };
          },
          false,
          "campaign/addManualRecipient",
        ),

      removeRecipient: (id) =>
        set(
          (state) => {
            const existing = state.recipientsById[id];

            if (!existing) {
              return state;
            }

            const recipientsById = { ...state.recipientsById };
            delete recipientsById[id];

            const recipientOrder = state.recipientOrder.filter(
              (recipientId) => recipientId !== id,
            );
            const totalRecipients = recipientOrder.length;
            const totalPages = Math.max(
              1,
              Math.ceil(totalRecipients / state.ui.pageSize),
            );

            return {
              recipientsById,
              recipientOrder,
              generationLogs: state.generationLogs.filter(
                (logItem) => logItem.recipientId !== id,
              ),
              ui: {
                ...state.ui,
                currentPage: Math.min(state.ui.currentPage, totalPages),
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
              },
            };
          },
          false,
          "campaign/removeRecipient",
        ),

      updateRecipientEmail: (id, email) =>
        set(
          (state) => ({
            recipientsById: {
              ...state.recipientsById,
              [id]: {
                ...state.recipientsById[id],
                email,
                bodySource: state.recipientsById[id]?.source === "manual" ? "manual" : state.recipientsById[id]?.bodySource,
                errorMessage: undefined,
              },
            },
            ui: {
              ...state.ui,
              needsDatabaseSync: true,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/updateRecipientEmail",
        ),

      updateRecipientBody: (id, body) =>
        set(
          (state) => ({
            recipientsById: {
              ...state.recipientsById,
              [id]: {
                ...state.recipientsById[id],
                body,
                bodySource: "manual",
                manualEditsSinceGenerate: true,
              },
            },
            ui: {
              ...state.ui,
              needsDatabaseSync: true,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/updateRecipientBody",
        ),

      updateRecipientSubject: (id, subject) =>
        set(
          (state) => ({
            recipientsById: {
              ...state.recipientsById,
              [id]: {
                ...state.recipientsById[id],
                subject,
              },
            },
            ui: {
              ...state.ui,
              needsDatabaseSync: true,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/updateRecipientSubject",
        ),

      updateRecipientCcEmails: (id, ccEmails) =>
        set(
          (state) => ({
            recipientsById: {
              ...state.recipientsById,
              [id]: {
                ...state.recipientsById[id],
                ccEmails,
              },
            },
            ui: {
              ...state.ui,
              needsDatabaseSync: true,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/updateRecipientCcEmails",
        ),

      toggleRecipientChecked: (id, checked) =>
        set(
          (state) => ({
            recipientsById: {
              ...state.recipientsById,
              [id]: {
                ...state.recipientsById[id],
                checked: checked ?? !state.recipientsById[id]?.checked,
              },
            },
          }),
          false,
          "campaign/toggleRecipientChecked",
        ),

      toggleRecipientsChecked: (ids, checked) =>
        set(
          (state) => ({
            recipientsById: ids.reduce<Record<string, CampaignRecipient>>((accumulator, id) => {
              accumulator[id] = {
                ...state.recipientsById[id],
                checked,
              };
              return accumulator;
            }, { ...state.recipientsById }),
          }),
          false,
          "campaign/toggleRecipientsChecked",
        ),

      setCurrentPage: (page) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              currentPage: Math.max(page, 1),
            },
          }),
          false,
          "campaign/setCurrentPage",
        ),

      setPageSize: (pageSize) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              pageSize,
              currentPage: 1,
            },
          }),
          false,
          "campaign/setPageSize",
        ),

      setRecipientStatusView: (view) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              recipientStatusView: view,
              currentPage: 1,
            },
          }),
          false,
          "campaign/setRecipientStatusView",
        ),

      startRecipientRegeneration: (id) =>
        set(
          (state) => {
            const existing = state.recipientsById[id];

            if (!existing) {
              return state;
            }

            return {
              recipientsById: {
                ...state.recipientsById,
                [id]: {
                  ...existing,
                  body: "",
                  isRegenerating: true,
                  regenerationPhase: "streaming" as const,
                  streamOriginalBody: existing.body,
                  errorMessage: undefined,
                },
              },
            };
          },
          false,
          "campaign/startRecipientRegeneration",
        ),

      appendGeneratedBodyChunk: (id, chunk) =>
        set(
          (state) => {
            const existing = state.recipientsById[id];

            if (!existing) {
              return state;
            }

            return {
              recipientsById: {
                ...state.recipientsById,
                [id]: {
                  ...existing,
                  body: `${existing.body}${chunk}`,
                  regenerationPhase: "streaming",
                },
              },
            };
          },
          false,
          "campaign/appendGeneratedBodyChunk",
        ),

      failRecipientRegeneration: ({ id, errorMessage, promptVersion = "stream-v1" }) =>
        set(
          (state) => {
            const existing = state.recipientsById[id];

            if (!existing) {
              return state;
            }

            const restoredBody = existing.streamOriginalBody ?? existing.body;
            const nextLog: GenerationLogItem = {
              id: createId("genlog"),
              recipientId: id,
              createdAt: new Date().toISOString(),
              promptVersion,
              inputBody: existing.streamOriginalBody ?? existing.body,
              status: "failed",
              errorMessage,
            };

            return {
              recipientsById: {
                ...state.recipientsById,
                [id]: {
                  ...existing,
                  body: restoredBody,
                  isRegenerating: false,
                  regenerationPhase: "idle",
                  streamOriginalBody: undefined,
                  errorMessage,
                },
              },
              generationLogs: [nextLog, ...state.generationLogs].slice(0, 50),
              ui: {
                ...state.ui,
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
              },
            };
          },
          false,
          "campaign/failRecipientRegeneration",
        ),

      applyGeneratedBody: ({ id, body, subject, reasoning, promptVersion = "stream-v1" }) =>
        set(
          (state) => {
            const existing = state.recipientsById[id];

            if (!existing) {
              return state;
            }

            const nextLog: GenerationLogItem = {
              id: createId("genlog"),
              recipientId: id,
              createdAt: new Date().toISOString(),
              promptVersion,
              inputBody: existing.streamOriginalBody ?? existing.body,
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
                  lastGenerationReasoning: reasoning,
                  manualEditsSinceGenerate: false,
                  isRegenerating: false,
                  regenerationPhase: "idle",
                  streamOriginalBody: undefined,
                  errorMessage: undefined,
                },
              },
              generationLogs: [nextLog, ...state.generationLogs].slice(0, 50),
              ui: {
                ...state.ui,
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
              },
            };
          },
          false,
          "campaign/applyGeneratedBody",
        ),

      markRecipientsQueued: (ids) =>
        set(
          (state) => ({
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
          }),
          false,
          "campaign/markRecipientsQueued",
        ),

      markRecipientsSending: (ids) =>
        set(
          (state) => ({
            recipientsById: ids.reduce<Record<string, CampaignRecipient>>((accumulator, id) => {
              accumulator[id] = {
                ...state.recipientsById[id],
                status: "sending",
                isSending: true,
                lastSendAttemptAt: new Date().toISOString(),
              };
              return accumulator;
            }, { ...state.recipientsById }),
          }),
          false,
          "campaign/markRecipientsSending",
        ),

      applySendResults: (results) =>
        set(
          (state) => {
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
                lastProviderMessageId: result.providerMessageId,
                errorMessage: result.errorMessage,
              };
            });

            return {
              recipientsById: nextRecipients,
              ui: {
                ...state.ui,
                isSending: false,
                needsDatabaseSync: true,
                lastDatabaseSyncError: undefined,
                sendProgress: {
                  total: state.ui.sendProgress.total,
                  completed: results.length,
                  success,
                  failed,
                },
              },
            };
          },
          false,
          "campaign/applySendResults",
        ),

      setSending: (value) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isSending: value,
            },
          }),
          false,
          "campaign/setSending",
        ),

      markDatabaseSyncPending: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              needsDatabaseSync: true,
            },
          }),
          false,
          "campaign/markDatabaseSyncPending",
        ),

      markDatabaseSyncStarted: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isDatabaseSyncing: true,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/markDatabaseSyncStarted",
        ),

      markDatabaseSyncSucceeded: (syncedAt) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isDatabaseSyncing: false,
              needsDatabaseSync: false,
              lastDatabaseSyncAt: syncedAt,
              lastDatabaseSyncError: undefined,
            },
          }),
          false,
          "campaign/markDatabaseSyncSucceeded",
        ),

      markDatabaseSyncFailed: (errorMessage) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isDatabaseSyncing: false,
              needsDatabaseSync: true,
              lastDatabaseSyncError: errorMessage,
            },
          }),
          false,
          "campaign/markDatabaseSyncFailed",
        ),

      restoreCampaignFromHistory: ({ campaign, recipients }) =>
        set(
          {
            campaign,
            importPreview: null,
            recipientsById: Object.fromEntries(
              recipients.map((recipient) => [recipient.id, recipient]),
            ),
            recipientOrder: recipients.map((recipient) => recipient.id),
            generationLogs: [],
            ui: {
              ...initialUiState,
            },
          },
          false,
          "campaign/restoreCampaignFromHistory",
        ),

      resetSession: () =>
        set(
          {
            campaign: null,
            importPreview: null,
            recipientsById: {},
            recipientOrder: [],
            generationLogs: [],
            ui: initialUiState,
          },
          false,
          "campaign/resetSession",
        ),
    }),
    { name: "campaign-store" }),
    {
      name: "campaign-browser-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        campaign: state.campaign,
        importPreview: state.importPreview,
        recipientsById: state.recipientsById,
        recipientOrder: state.recipientOrder,
        generationLogs: state.generationLogs,
        ui: {
          currentPage: state.ui.currentPage,
          pageSize: state.ui.pageSize,
          recipientStatusView: state.ui.recipientStatusView,
          needsDatabaseSync: state.ui.needsDatabaseSync,
          lastDatabaseSyncAt: state.ui.lastDatabaseSyncAt,
          lastDatabaseSyncError: state.ui.lastDatabaseSyncError,
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CampaignStore>;

        return {
          ...currentState,
          ...persisted,
          ui: {
            ...currentState.ui,
            ...persisted.ui,
          },
        };
      },
    },
  ),
);
