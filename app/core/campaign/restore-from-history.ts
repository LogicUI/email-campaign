import { buildImportPreview } from "@/core/excel/build-import-preview";
import { createId } from "@/core/utils/ids";
import type { Campaign, CampaignRecipient, ImportPreview } from "@/types/campaign";
import type { CampaignHistoryDetail, SavedListDetail } from "@/types/database";

/**
 * Reconstructs an import preview from a persisted saved list.
 *
 * This lets the app reopen older imported lists using the same review/compose
 * pipeline as a fresh workbook upload.
 *
 * @param savedList Persisted saved-list detail from the app database.
 * @returns Import preview equivalent derived from the saved list rows.
 */
export function buildImportPreviewFromSavedList(savedList: SavedListDetail): ImportPreview {
  return buildImportPreview({
    preferredEmailColumn: savedList.selectedEmailColumn,
    preferredRecipientColumn: savedList.selectedRecipientColumn,
    savedListId: savedList.id,
    sourceFiles: [
      {
        fileName: savedList.sourceFileLabel,
      },
    ],
    sourceRows: savedList.rows.map((row) => ({
      raw: row.raw,
      sourceFileName: savedList.sourceFileLabel,
      originalRowIndex: row.rowIndex,
    })),
  });
}

/**
 * Creates a new editable campaign copy from historical campaign data.
 *
 * This powers the "reuse campaign" action by turning immutable history records back
 * into a fresh workspace state with new campaign/recipient ids.
 *
 * @param history Persisted campaign history detail.
 * @returns New campaign metadata and recipient drafts for the workspace.
 */
export function buildCampaignFromHistory(history: CampaignHistoryDetail): {
  campaign: Campaign;
  recipients: CampaignRecipient[];
} {
  const createdAt = new Date().toISOString();

  return {
    campaign: {
      id: createId("campaign"),
      name: `${history.name} copy`,
      globalSubject: history.globalSubject,
      globalBodyTemplate: history.globalBodyTemplate,
      createdAt,
      sourceType: "reused_history",
      savedListId: history.savedListId,
      importedFileName: history.name,
      detectedEmailColumn: undefined,
      detectedRecipientColumn: undefined,
      totalRows: history.recipients.length,
      validRows: history.recipients.length,
      invalidRows: 0,
    },
    recipients: history.recipients.map((recipient, index) => ({
      id: createId("recipient"),
      rowIndex: index + 1,
      source: "imported",
      email: recipient.email,
      recipient: recipient.recipient,
      subject: recipient.subject,
      body: recipient.body,
      checked: true,
      sent: false,
      status: "draft",
      fields: recipient.fields,
      bodySource: "manual",
      manualEditsSinceGenerate: false,
      isRegenerating: false,
      regenerationPhase: "idle",
      isSending: false,
    })),
  };
}
