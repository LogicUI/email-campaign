"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { buildRecipientDraft } from "@/core/campaign/build-recipient-draft";
import { mergeTemplate } from "@/core/campaign/merge-template";
import { createId } from "@/core/utils/ids";
import type {
  CampaignStore,
  CampaignStoreUiState,
} from "@/types/campaign-store";
import type {
  Campaign,
  CampaignRecipient,
  GenerationLogItem,
  ImportPreview,
} from "@/types/campaign";
import type { BulkSendResultItem } from "@/types/api";

const initialUiState: CampaignStoreUiState = {
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

export const useCampaignStore = create<CampaignStore>()(
  devtools(
    (set, get) => ({
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

      setSelectedEmailColumn: (column) =>
        set(
          (state) => {
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
          },
          false,
          "campaign/setSelectedEmailColumn",
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

        set(
          {
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
            recipientsById: Object.fromEntries(
              recipients.map((recipient) => [recipient.id, recipient]),
            ),
            recipientOrder: recipients.map((recipient) => recipient.id),
            ui: {
              ...get().ui,
              composeDialogOpen: false,
              currentPage: 1,
            },
          },
          false,
          "campaign/createCampaignFromPreview",
        );
      },

      updateGlobalTemplate: ({ globalSubject, globalBodyTemplate, applyMode }) =>
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
          }),
          false,
          "campaign/updateRecipientSubject",
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
    { name: "campaign-store" },
  ),
);
