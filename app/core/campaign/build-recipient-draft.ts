import { mergeTemplate } from "@/core/campaign/merge-template";
import { createId } from "@/core/utils/ids";
import type { CampaignRecipient, ImportPreviewRow } from "@/types/campaign";

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
