import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { CampaignBuilderPage } from "@/components/campaign/campaign-builder-page";
import { parseWorkbookFile } from "@/core/excel/parse-workbook";
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

  it("regenerates a recipient draft through the mocked AI endpoint", async () => {
    const user = userEvent.setup();
    seedCampaign();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            recipientId: "recipient_mocked",
            subject: "Refined intro for North Clinic",
            body: "Rewritten outreach body for North Clinic.",
          },
        }),
      }),
    );

    render(<CampaignBuilderPage />);

    await user.click(screen.getAllByRole("button", { name: "Regenerate" })[0]);

    await waitFor(() => {
      expect(screen.getAllByLabelText("Subject")[0]).toHaveValue(
        "Refined intro for North Clinic",
      );
      expect(screen.getAllByLabelText("Body")[0]).toHaveValue(
        "Rewritten outreach body for North Clinic.",
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
                resendId: "resend_mocked_1",
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
