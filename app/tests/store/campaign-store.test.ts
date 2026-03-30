import { describe, expect, it } from "vitest";

import { useCampaignStore } from "@/store/campaign-store";
import type { CampaignStore } from "@/types/campaign-store";

describe("campaign store persistence", () => {
  it("persists text drafts while omitting rich-media editor state", () => {
    const currentUi = useCampaignStore.getState().ui;

    useCampaignStore.setState({
      campaign: {
        id: "campaign_1",
        name: "Clinic outreach",
        globalSubject: "Hello {{clinic_name}}",
        globalBodyTemplate:
          '<p>Hello team</p><p><img src="cid:inline_1" data-content-id="inline_1" /></p><p>Regards</p>',
        globalBodyEditorJson:
          '{"type":"doc","content":[{"type":"inlineImage","attrs":{"src":"data:image/png;base64,abc"}}]}',
        globalAttachments: [
          {
            filename: "logo.png",
            contentType: "image/png",
            data: "abc",
            isInline: true,
            contentId: "inline_1",
          },
        ],
        createdAt: "2026-03-29T00:00:00.000Z",
        sourceType: "uploaded_list",
        importedFileName: "leads.csv",
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
      },
      importPreview: null,
      recipientsById: {
        recipient_1: {
          id: "recipient_1",
          rowIndex: 1,
          source: "imported",
          email: "north@example.com",
          subject: "Hello North Clinic",
          body:
            '<p>Hi North Clinic</p><p><img src="cid:inline_1" data-content-id="inline_1" /></p><p>See you soon</p>',
          bodyEditorJson:
            '{"type":"doc","content":[{"type":"inlineImage","attrs":{"src":"data:image/png;base64,abc"}}]}',
          attachments: [
            {
              filename: "logo.png",
              contentType: "image/png",
              data: "abc",
              isInline: true,
              contentId: "inline_1",
            },
          ],
          checked: true,
          sent: false,
          status: "draft",
          fields: {
            clinic_name: "North Clinic",
          },
          bodySource: "manual",
          manualEditsSinceGenerate: true,
          isRegenerating: false,
          isSending: false,
        },
      },
      recipientOrder: ["recipient_1"],
      generationLogs: [],
      ui: {
        ...currentUi,
        currentPage: 2,
        restoredDraftWarning: undefined,
        persistedInlineMediaRemoved: false,
      },
    });

    const persistedStore = JSON.parse(
      localStorage.getItem("campaign-browser-storage") ?? "null",
    );

    expect(persistedStore.version).toBe(2);
    expect(persistedStore.state.campaign.globalBodyEditorJson).toBeUndefined();
    expect(persistedStore.state.campaign.globalAttachments).toBeUndefined();
    expect(persistedStore.state.campaign.globalBodyTemplate).not.toContain("<img");
    expect(persistedStore.state.recipientsById.recipient_1.bodyEditorJson).toBeUndefined();
    expect(persistedStore.state.recipientsById.recipient_1.attachments).toBeUndefined();
    expect(persistedStore.state.recipientsById.recipient_1.body).not.toContain("<img");
    expect(persistedStore.state.recipientsById.recipient_1.body).toContain(
      "Hi North Clinic",
    );
    expect(persistedStore.state.ui.persistedInlineMediaRemoved).toBe(true);
  });

  it("migrates older snapshots and marks stripped inline media for restored drafts", async () => {
    const migrate = useCampaignStore.persist.getOptions().migrate;

    const migrated = (await migrate?.(
      {
        campaign: {
          id: "campaign_legacy",
          name: "Legacy outreach",
          globalSubject: "Hello",
          globalBodyTemplate:
            '<p>Hello</p><p><img src="cid:inline_legacy" data-content-id="inline_legacy" /></p>',
          globalBodyEditorJson:
            '{"type":"doc","content":[{"type":"inlineImage","attrs":{"src":"data:image/png;base64,legacy"}}]}',
          createdAt: "2026-03-29T00:00:00.000Z",
          sourceType: "uploaded_list",
          importedFileName: "legacy.csv",
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
        },
        importPreview: null,
        recipientsById: {
          recipient_legacy: {
            id: "recipient_legacy",
            rowIndex: 1,
            source: "imported",
            email: "legacy@example.com",
            subject: "Legacy subject",
            body:
              '<p>Legacy body</p><p><img src="cid:inline_legacy" data-content-id="inline_legacy" /></p>',
            bodyEditorJson:
              '{"type":"doc","content":[{"type":"inlineImage","attrs":{"src":"data:image/png;base64,legacy"}}]}',
            checked: true,
            sent: false,
            status: "draft",
            fields: {},
            bodySource: "manual",
            manualEditsSinceGenerate: true,
            isRegenerating: false,
            isSending: false,
          },
        },
        recipientOrder: ["recipient_legacy"],
        generationLogs: [],
        ui: {
          currentPage: 1,
          pageSize: 12,
          recipientStatusView: "unsent",
          needsDatabaseSync: false,
        },
      },
      1,
    )) as Partial<CampaignStore> | undefined;

    expect(migrated?.campaign?.globalBodyEditorJson).toBeUndefined();
    expect(migrated?.campaign?.globalBodyTemplate).not.toContain("<img");
    expect(migrated?.recipientsById?.recipient_legacy?.bodyEditorJson).toBeUndefined();
    expect(migrated?.recipientsById?.recipient_legacy?.body).not.toContain("<img");
    expect(migrated?.ui?.persistedInlineMediaRemoved).toBe(true);
  });

  it("overwrites every unsent recipient when the global template is updated", () => {
    const currentUi = useCampaignStore.getState().ui;

    useCampaignStore.setState({
      campaign: {
        id: "campaign_apply_all_unsent",
        name: "Clinic outreach",
        globalSubject: "Old {{clinic_name}} subject",
        globalBodyTemplate: "Old body for {{clinic_name}}",
        createdAt: "2026-03-30T00:00:00.000Z",
        sourceType: "uploaded_list",
        importedFileName: "leads.csv",
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
      },
      importPreview: null,
      recipientsById: {
        recipient_unsent: {
          id: "recipient_unsent",
          rowIndex: 1,
          source: "imported",
          email: "north@example.com",
          subject: "Custom subject",
          body: "Manually changed body",
          bodyEditorJson: '{"type":"doc","content":[]}',
          ccEmails: ["old-cc@example.com"],
          attachments: [{ filename: "old.pdf", contentType: "application/pdf", data: "b2xk" }],
          checked: true,
          sent: false,
          status: "draft",
          fields: {
            clinic_name: "North Clinic",
          },
          bodySource: "manual",
          manualEditsSinceGenerate: true,
          isRegenerating: false,
          isSending: false,
        },
        recipient_sent: {
          id: "recipient_sent",
          rowIndex: 2,
          source: "imported",
          email: "south@example.com",
          subject: "Sent custom subject",
          body: "Sent custom body",
          ccEmails: ["sent-cc@example.com"],
          attachments: [{ filename: "sent.pdf", contentType: "application/pdf", data: "c2VudA==" }],
          checked: false,
          sent: true,
          status: "sent",
          fields: {
            clinic_name: "South Clinic",
          },
          bodySource: "manual",
          manualEditsSinceGenerate: true,
          isRegenerating: false,
          isSending: false,
        },
      },
      recipientOrder: ["recipient_unsent", "recipient_sent"],
      generationLogs: [],
      ui: {
        ...currentUi,
        restoredDraftWarning: undefined,
        persistedInlineMediaRemoved: false,
      },
    });

    useCampaignStore.getState().updateGlobalTemplate({
      globalSubject: "Helping {{clinic_name}} reduce no-shows",
      globalBodyTemplate: "Hi {{clinic_name}},\n\nLatest message.",
      globalBodyEditorJson: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Latest"}]}]}',
      globalCcEmails: ["new-cc@example.com"],
      globalAttachments: [
        { filename: "overview.pdf", contentType: "application/pdf", data: "bmV3" },
      ],
    });

    const nextState = useCampaignStore.getState();
    const unsentRecipient = nextState.recipientsById.recipient_unsent;
    const sentRecipient = nextState.recipientsById.recipient_sent;

    expect(unsentRecipient.subject).toBe("Helping North Clinic reduce no-shows");
    expect(unsentRecipient.body).toContain("Hi North Clinic");
    expect(unsentRecipient.ccEmails).toEqual(["new-cc@example.com"]);
    expect(unsentRecipient.attachments).toEqual([
      { filename: "overview.pdf", contentType: "application/pdf", data: "bmV3" },
    ]);
    expect(unsentRecipient.bodyEditorJson).toBeUndefined();
    expect(unsentRecipient.bodySource).toBe("global-template");
    expect(unsentRecipient.manualEditsSinceGenerate).toBe(false);

    expect(sentRecipient.subject).toBe("Sent custom subject");
    expect(sentRecipient.body).toBe("Sent custom body");
    expect(sentRecipient.ccEmails).toEqual(["sent-cc@example.com"]);
    expect(sentRecipient.attachments).toEqual([
      { filename: "sent.pdf", contentType: "application/pdf", data: "c2VudA==" },
    ]);
  });
});
