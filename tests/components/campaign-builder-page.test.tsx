import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CampaignBuilderPage } from "@/components/campaign/campaign-builder-page";
import { parseWorkbookFile } from "@/core/excel/parse-workbook";
import { useAiSettingsStore } from "@/store/ai-settings-store";
import { useCampaignStore } from "@/store/campaign-store";
import type { ImportPreview } from "@/types/campaign";

vi.mock("@/core/excel/parse-workbook", () => ({
  parseWorkbookFile: vi.fn(),
}));

function makePreview(): ImportPreview {
  return {
    fileName: "leads.csv",
    sheetName: "Sheet1",
    headers: ["email", "clinic_name", "address"],
    rows: [
      {
        tempId: "row_1",
        rowIndex: 1,
        email: "north@example.com",
        isValid: true,
        fields: {
          clinic_name: "North Clinic",
          address: "1 Main St",
        },
        raw: {
          email: "north@example.com",
          clinic_name: "North Clinic",
          address: "1 Main St",
        },
      },
      {
        tempId: "row_2",
        rowIndex: 2,
        email: undefined,
        isValid: false,
        invalidReason: "Invalid email format.",
        fields: {
          clinic_name: "Bad Clinic",
          address: "2 Main St",
        },
        raw: {
          email: "bad-email",
          clinic_name: "Bad Clinic",
          address: "2 Main St",
        },
      },
      {
        tempId: "row_3",
        rowIndex: 3,
        email: "south@example.com",
        isValid: true,
        fields: {
          clinic_name: "South Clinic",
          address: "3 Main St",
        },
        raw: {
          email: "south@example.com",
          clinic_name: "South Clinic",
          address: "3 Main St",
        },
      },
      {
        tempId: "row_4",
        rowIndex: 4,
        email: "north@example.com",
        isValid: false,
        invalidReason: "Duplicate email in upload.",
        fields: {
          clinic_name: "Duplicate Clinic",
          address: "4 Main St",
        },
        raw: {
          email: "north@example.com",
          clinic_name: "Duplicate Clinic",
          address: "4 Main St",
        },
      },
    ],
    validCount: 2,
    invalidCount: 2,
    candidateEmailColumns: ["email"],
    selectedEmailColumn: "email",
  };
}

function seedCampaign() {
  const store = useCampaignStore.getState();
  store.setImportPreview(makePreview());
  store.createCampaignFromPreview({
    name: "Clinic outreach",
    globalSubject: "Helping {{clinic_name}} reduce no-shows",
    globalBodyTemplate: "Hi {{clinic_name}},\n\nI wanted to share a quick idea for {{address}}.",
  });
}

describe("CampaignBuilderPage", () => {
  it("opens the import preview after a file upload", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile.mockResolvedValue(makePreview());

    render(<CampaignBuilderPage />);

    await user.upload(
      screen.getByLabelText(/choose csv or excel file/i),
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "leads.csv", {
        type: "text/csv",
      }),
    );

    expect(mockedParseWorkbookFile).toHaveBeenCalledTimes(1);
    await screen.findByText("Review imported rows");
    expect(screen.getByText("4 rows")).toBeInTheDocument();
    expect(screen.getByText("2 valid")).toBeInTheDocument();
    expect(screen.getByText("2 invalid")).toBeInTheDocument();
  });

  it("creates recipient drafts from the compose dialog", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makePreview());

    render(<CampaignBuilderPage />);

    await user.click(screen.getByRole("button", { name: "Continue to message setup" }));
    await screen.findByText("Define campaign message");

    await user.clear(screen.getByLabelText("Campaign name"));
    await user.type(screen.getByLabelText("Campaign name"), "Clinic outreach");
    await user.type(
      screen.getByLabelText("Global subject"),
      "Helping {{clinic_name}} reduce no-shows",
    );
    await user.type(
      screen.getByLabelText("Global body template"),
      "Hi {{clinic_name}},\n\nI wanted to share a quick idea for {{address}}.",
    );
    await user.click(screen.getByRole("button", { name: "Create recipient drafts" }));

    await screen.findByText("Send queue");
    expect(screen.getByText("North Clinic")).toBeInTheDocument();
    expect(screen.getByText("South Clinic")).toBeInTheDocument();
    expect(screen.getByText("2 checked")).toBeInTheDocument();
  });

  it("adds a manual recipient card at the top of the list", async () => {
    const user = userEvent.setup();
    seedCampaign();

    render(<CampaignBuilderPage />);

    await user.click(screen.getByRole("button", { name: "New recipient" }));

    const firstRecipientId = useCampaignStore.getState().recipientOrder[0];
    const firstRecipient = useCampaignStore.getState().recipientsById[firstRecipientId];

    expect(firstRecipient.source).toBe("manual");
    expect(screen.getByText("Manual")).toBeInTheDocument();
    const recipientEmailInput = screen.getByLabelText(`Recipient email ${firstRecipientId}`);
    expect(recipientEmailInput).toBeInTheDocument();
    await user.type(recipientEmailInput, "manual@example.com");
    await user.clear(screen.getAllByLabelText("Body")[0]);
    await user.type(screen.getAllByLabelText("Body")[0], "Manual body copy.");

    await waitFor(() => {
      const updatedRecipient =
        useCampaignStore.getState().recipientsById[firstRecipientId];
      expect(updatedRecipient.email).toBe("manual@example.com");
      expect(updatedRecipient.body).toBe("Manual body copy.");
    });
  });

  it("removes a recipient card from the queue", async () => {
    const user = userEvent.setup();
    seedCampaign();

    render(<CampaignBuilderPage />);

    const recipientId = useCampaignStore.getState().recipientOrder[0];

    await user.click(screen.getByRole("button", { name: `Remove recipient ${recipientId}` }));

    await waitFor(() => {
      expect(useCampaignStore.getState().recipientOrder).toHaveLength(1);
      expect(useCampaignStore.getState().recipientsById[recipientId]).toBeUndefined();
      expect(screen.queryByRole("button", { name: `Remove recipient ${recipientId}` })).not.toBeInTheDocument();
      expect(screen.getByText("1 checked")).toBeInTheDocument();
    });
  });

  it("clears all selected recipients from the send queue", async () => {
    const user = userEvent.setup();
    seedCampaign();

    render(<CampaignBuilderPage />);

    expect(screen.getByText("2 checked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all selected" }));

    await waitFor(() => {
      expect(screen.getByText("0 checked")).toBeInTheDocument();
      expect(
        useCampaignStore
          .getState()
          .recipientOrder.every(
            (recipientId) => !useCampaignStore.getState().recipientsById[recipientId].checked,
          ),
      ).toBe(true);
    });
  });

  it("shows the sender identity on each card and requests AI regenerate", async () => {
    const user = userEvent.setup();
    seedCampaign();
    useAiSettingsStore.getState().setProviderApiKey("openai", "sk-test-openai");
    const recipientId = useCampaignStore.getState().recipientOrder[0];
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: start\ndata: {"type":"start","recipientId":"${recipientId}"}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `event: body_delta\ndata: {"type":"body_delta","recipientId":"${recipientId}","chunk":"Rewritten outreach "}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `event: body_delta\ndata: {"type":"body_delta","recipientId":"${recipientId}","chunk":"body for North Clinic."}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `event: final\ndata: {"type":"final","recipientId":"${recipientId}","body":"Rewritten outreach body for North Clinic."}\n\n`,
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers({
        "Content-Type": "text/event-stream; charset=utf-8",
      }),
    });

    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    render(<CampaignBuilderPage />);

    await user.click(screen.getAllByRole("button", { name: "Regenerate" })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("From")).toHaveLength(2);
      expect(screen.getAllByText("authenticated@example.com")).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/regenerate",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("applies send results from the mocked bulk send endpoint", async () => {
    const user = userEvent.setup();
    seedCampaign();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            sendJobId: "sendjob_mocked",
            results: [
              {
                recipientId: useCampaignStore.getState().recipientOrder[0],
                status: "sent",
                providerMessageId: "gmail_mocked_1",
              },
              {
                recipientId: useCampaignStore.getState().recipientOrder[1],
                status: "failed",
                errorMessage: "Mailbox full",
              },
            ],
          },
        }),
      }),
    );

    render(<CampaignBuilderPage />);

    await user.click(screen.getByRole("button", { name: "Send selected" }));

    await waitFor(() => {
      expect(screen.getByText("1 sent")).toBeInTheDocument();
      expect(screen.getByText("1 failed")).toBeInTheDocument();
      expect(screen.getByText("Mailbox full")).toBeInTheDocument();
    });
  });
});
