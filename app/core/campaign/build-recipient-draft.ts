import { mergeTemplate } from "@/core/campaign/merge-template";
import { createId } from "@/core/utils/ids";
import type { CampaignRecipient, ImportPreviewRow } from "@/types/campaign";

/**
 * Builds one campaign recipient draft from a validated import preview row.
 *
 * This exists so campaign creation can consistently derive subject/body content and
 * default recipient state from imported spreadsheet data.
 *
 * @param params.row Validated import preview row.
 * @param params.globalSubject Global subject template entered by the user.
 * @param params.globalBodyTemplate Global body template entered by the user.
 * @returns Ready-to-edit campaign recipient draft.
 */
export function buildRecipientDraft(params: {
  row: ImportPreviewRow;
  globalSubject: string;
  globalBodyTemplate: string;
}): CampaignRecipient {
  const { row, globalBodyTemplate, globalSubject } = params;

  return {
    id: createId("recipient"),
    rowIndex: row.rowIndex,
    source: "imported",
    email: row.email ?? "",
    recipient: row.recipient,
    sourceFileName: row.sourceFileName,
    sourceSheetName: row.sourceSheetName,
    subject: mergeTemplate(globalSubject, row.fields),
    body: mergeTemplate(globalBodyTemplate, row.fields),
    checked: true,
    sent: false,
    status: "ready",
    fields: row.fields,
    bodySource: "global-template",
    manualEditsSinceGenerate: false,
    isRegenerating: false,
    regenerationPhase: "idle",
    isSending: false,
  };
}
