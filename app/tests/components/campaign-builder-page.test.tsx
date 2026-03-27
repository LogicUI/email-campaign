import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CampaignBuilderPage } from "@/components/campaign/campaign-builder-page";
import { buildImportPreview } from "@/core/excel/build-import-preview";
import {
  DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT,
  DEFAULT_REGENERATE_PROMPT,
} from "@/core/ai/regenerate-guardrails";
import {
  loadUploadedWorkbook,
  saveUploadedWorkbook,
} from "@/core/excel/persist-uploaded-workbook";
import { parseWorkbookFile } from "@/core/excel/parse-workbook";
import { useAiSettingsStore } from "@/store/ai-settings-store";
import { useCampaignStore } from "@/store/campaign-store";
import type { BulkSendResponseData } from "@/types/api";
import type { ImportPreview, ImportSourceRow } from "@/types/campaign";

vi.mock("@/core/excel/parse-workbook", () => ({
  parseWorkbookFile: vi.fn(),
}));

vi.mock("@/frontendApi/send", () => ({
  sendBulk: vi.fn(),
}));

const { sendBulk } = await import("@/frontendApi/send");

function renderCampaignBuilderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignBuilderPage />
    </QueryClientProvider>,
  );
}

function makePreview(): ImportPreview {
  const sourceRows: ImportSourceRow[] = [
    {
      raw: {
        email: "north@example.com",
        clinic_name: "North Clinic",
        address: "1 Main St",
      },
      sourceFileName: "leads.csv",
      sourceSheetName: "Sheet1",
      originalRowIndex: 2,
    },
    {
      raw: {
        email: "bad-email",
        clinic_name: "Bad Clinic",
        address: "2 Main St",
      },
      sourceFileName: "leads.csv",
      sourceSheetName: "Sheet1",
      originalRowIndex: 3,
    },
    {
      raw: {
        email: "south@example.com",
        clinic_name: "South Clinic",
        address: "3 Main St",
      },
      sourceFileName: "leads.csv",
      sourceSheetName: "Sheet1",
      originalRowIndex: 4,
    },
    {
      raw: {
        email: "north@example.com",
        clinic_name: "Duplicate Clinic",
        address: "4 Main St",
      },
      sourceFileName: "leads.csv",
      sourceSheetName: "Sheet1",
      originalRowIndex: 5,
    },
  ];

  return buildImportPreview({
    sourceFiles: [
      {
        fileName: "leads.csv",
        sheetName: "Sheet1",
      },
    ],
    sourceRows,
  });
}

function makeCompanyPreview(): ImportPreview {
  return buildImportPreview({
    sourceFiles: [
      {
        fileName: "accounts.csv",
        sheetName: "Sheet1",
      },
    ],
    sourceRows: [
      {
        raw: {
          email: "hello@acme.com",
          company_name: "Acme",
          industry: "SaaS",
        },
        sourceFileName: "accounts.csv",
        sourceSheetName: "Sheet1",
        originalRowIndex: 2,
      },
    ],
  });
}

function makeUndetectedRecipientPreview(): ImportPreview {
  const preview = buildImportPreview({
    sourceFiles: [
      {
        fileName: "owners.csv",
        sheetName: "Sheet1",
      },
    ],
    sourceRows: [
      {
        raw: {
          email: "hello@example.com",
          owner_name: "Jordan Lee",
          address: "1 Main St",
        },
        sourceFileName: "owners.csv",
        sourceSheetName: "Sheet1",
        originalRowIndex: 2,
      },
    ],
  });

  return {
    ...preview,
    selectedRecipientColumn: undefined,
  };
}

function makeContactPreview(): ImportPreview {
  return buildImportPreview({
    sourceFiles: [
      {
        fileName: "contacts.csv",
        sheetName: "Sheet1",
      },
    ],
    sourceRows: [
      {
        raw: {
          email: "north@example.com",
          clinic_name: "North Clinic",
          contact_name: "Dr Tan",
        },
        sourceFileName: "contacts.csv",
        sourceSheetName: "Sheet1",
        originalRowIndex: 2,
      },
    ],
  });
}

function makeAdditionalPreview(): ImportPreview {
  return buildImportPreview({
    sourceFiles: [
      {
        fileName: "extra-leads.csv",
        sheetName: "Sheet1",
      },
    ],
    sourceRows: [
      {
        raw: {
          email: "west@example.com",
          clinic_name: "West Clinic",
          address: "5 Main St",
        },
        sourceFileName: "extra-leads.csv",
        sourceSheetName: "Sheet1",
        originalRowIndex: 2,
      },
      {
        raw: {
          email: "north@example.com",
          clinic_name: "North Clinic Again",
          address: "6 Main St",
        },
        sourceFileName: "extra-leads.csv",
        sourceSheetName: "Sheet1",
        originalRowIndex: 3,
      },
    ],
  });
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

    renderCampaignBuilderPage();

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
    expect(screen.getByLabelText("Recipient / addressee column")).toHaveValue(
      "clinic_name",
    );
    expect(screen.getByText("leads.csv · Row 3")).toBeInTheDocument();
    expect(screen.getAllByText("Invalid email format.").length).toBeGreaterThan(0);
    expect(screen.getByText("leads.csv · Row 5")).toBeInTheDocument();
    expect(screen.getAllByText("Duplicate email in upload.").length).toBeGreaterThan(0);
    expect(loadUploadedWorkbook()).toMatchObject({
      files: [
        expect.objectContaining({
          fileName: "leads.csv",
          mimeType: "text/csv",
        }),
      ],
    });
  });

  it("restores the saved workbook from the upload screen", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile.mockResolvedValue(makePreview());
    await saveUploadedWorkbook(
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "saved-leads.csv", {
        type: "text/csv",
      }),
    );

    renderCampaignBuilderPage();

    expect(screen.getByText("Saved workbook set:")).toBeInTheDocument();
    expect(screen.getByText("saved-leads.csv")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use saved file" }));

    await screen.findByText("Review imported rows");
    expect(mockedParseWorkbookFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "saved-leads.csv",
      }),
    );
  });

  it("appends more uploaded files on top of the current import preview", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile
      .mockResolvedValueOnce(makePreview())
      .mockResolvedValueOnce(makeAdditionalPreview());

    renderCampaignBuilderPage();

    await user.upload(
      screen.getByLabelText(/choose csv or excel file/i),
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "leads.csv", {
        type: "text/csv",
      }),
    );

    await screen.findByText("Review imported rows");

    await user.upload(
      screen.getByLabelText(/add more files/i),
      new File(["email,clinic_name\nwest@example.com,West Clinic"], "extra-leads.csv", {
        type: "text/csv",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("6 rows")).toBeInTheDocument();
      expect(screen.getByText("3 valid")).toBeInTheDocument();
      expect(screen.getByText("3 invalid")).toBeInTheDocument();
    });
    expect(screen.getAllByText("leads.csv + 1 more").length).toBeGreaterThan(0);
    expect(screen.getByText("2 files")).toBeInTheDocument();
    expect(screen.getAllByText("Duplicate email in upload.").length).toBeGreaterThan(1);
    expect(screen.getByText("extra-leads.csv · Row 3")).toBeInTheDocument();
    expect(loadUploadedWorkbook()).toMatchObject({
      files: [
        expect.objectContaining({ fileName: "leads.csv" }),
        expect.objectContaining({ fileName: "extra-leads.csv" }),
      ],
    });
  });

  it("shows uploaded files in the review dialog and removes a selected file", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile
      .mockResolvedValueOnce(makePreview())
      .mockResolvedValueOnce(makeAdditionalPreview());

    renderCampaignBuilderPage();

    await user.upload(
      screen.getByLabelText(/choose csv or excel file/i),
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "leads.csv", {
        type: "text/csv",
      }),
    );

    await screen.findByText("Review imported rows");

    await user.upload(
      screen.getByLabelText(/add more files/i),
      new File(["email,clinic_name\nwest@example.com,West Clinic"], "extra-leads.csv", {
        type: "text/csv",
      }),
    );

    await screen.findByText("Uploaded files");
    expect(screen.getByText("leads.csv")).toBeInTheDocument();
    expect(screen.getByText("extra-leads.csv")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove extra-leads.csv" }));

    await waitFor(() => {
      expect(screen.getByText("4 rows")).toBeInTheDocument();
      expect(screen.getByText("2 valid")).toBeInTheDocument();
      expect(screen.getByText("2 invalid")).toBeInTheDocument();
    });
    expect(screen.queryByText("extra-leads.csv · Row 3")).not.toBeInTheDocument();
    expect(loadUploadedWorkbook()).toMatchObject({
      files: [expect.objectContaining({ fileName: "leads.csv" })],
    });
    expect(loadUploadedWorkbook()?.files).toHaveLength(1);
  });

  it("requires selecting a recipient column before continuing", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makeUndetectedRecipientPreview());

    renderCampaignBuilderPage();

    const continueButton = screen.getByRole("button", {
      name: "Continue to message setup",
    });
    expect(continueButton).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText("Recipient / addressee column"),
      "owner_name",
    );

    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    await screen.findByText("Define campaign message");
    expect(screen.getByLabelText("Global subject")).toHaveValue(
      "Quick introduction for {{owner_name}}",
    );
  });

  it("creates recipient drafts from the compose dialog", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makePreview());

    renderCampaignBuilderPage();

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

  it("prefills the compose dialog with a default campaign message", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makePreview());

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Continue to message setup" }));
    await screen.findByText("Define campaign message");

    expect(screen.getByLabelText("Campaign name")).toHaveValue("Intro outreach campaign");
    expect(screen.getByLabelText("Global subject")).toHaveValue(
      "Quick introduction for {{clinic_name}}",
    );
    const globalBodyTemplate = screen.getByLabelText("Global body template");
    expect(globalBodyTemplate).toHaveValue(
      "Hi {{clinic_name}} team,\n\nI wanted to reach out with a quick introduction and see whether there could be a fit to work together.\n\nIf helpful, I can send a short overview tailored to your goals and current priorities.\n\nWould you be open to a quick conversation next week?",
    );
  });

  it("adapts the default outreach message to other name-like columns", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makeCompanyPreview());

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Continue to message setup" }));
    await screen.findByText("Define campaign message");

    expect(screen.getByLabelText("Global subject")).toHaveValue(
      "Quick introduction for {{company_name}}",
    );
    expect(screen.getByLabelText("Global body template")).toHaveValue(
      "Hi {{company_name}} team,\n\nI wanted to reach out with a quick introduction and see whether there could be a fit to work together.\n\nIf helpful, I can send a short overview tailored to your goals and current priorities.\n\nWould you be open to a quick conversation next week?",
    );
  });

  it("uses the selected recipient mapping for imported card titles", async () => {
    const user = userEvent.setup();
    useCampaignStore.getState().setImportPreview(makeContactPreview());

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Continue to message setup" }));
    await screen.findByText("Define campaign message");
    await user.click(screen.getByRole("button", { name: "Create recipient drafts" }));

    await screen.findByText("Send queue");
    expect(screen.getByText("Dr Tan")).toBeInTheDocument();
    expect(screen.queryByText("North Clinic")).not.toBeInTheDocument();
  });

  it("adds a manual recipient card at the top of the list", async () => {
    const user = userEvent.setup();
    seedCampaign();

    renderCampaignBuilderPage();

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

    renderCampaignBuilderPage();

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

    renderCampaignBuilderPage();

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
    let streamController!: ReadableStreamDefaultController<Uint8Array<ArrayBufferLike>>;
    const stream = new ReadableStream<Uint8Array<ArrayBufferLike>>({
      start(controller) {
        streamController = controller;
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

    renderCampaignBuilderPage();

    expect(screen.getAllByText("authenticated@example.com")).toHaveLength(3);

    await user.click(screen.getAllByRole("button", { name: "Regenerate with prompt" })[0]);
    expect(screen.getByRole("heading", { name: "Regenerate with prompt" })).toBeInTheDocument();

    const promptInput = screen.getByLabelText("Prompt");
    expect(promptInput).toHaveValue(DEFAULT_REGENERATE_PROMPT);

    await user.click(screen.getByRole("button", { name: "Regenerate email" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/regenerate",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Regenerate with prompt" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Generating..." })).toBeInTheDocument();

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestBody =
      typeof requestInit?.body === "string" ? JSON.parse(requestInit.body) : undefined;

    expect(requestBody).toMatchObject({
      recipientId,
      prompt: DEFAULT_REGENERATE_PROMPT,
      provider: "openai",
      apiKey: "sk-test-openai",
    });

    streamController.enqueue(
      encoder.encode(
        `event: start\ndata: {"type":"start","recipientId":"${recipientId}"}\n\n`,
      ),
    );
    streamController.enqueue(
      encoder.encode(
        `event: body_delta\ndata: {"type":"body_delta","recipientId":"${recipientId}","chunk":"Rewritten outreach "}\n\n`,
      ),
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText("Body")[0]).toHaveValue("Rewritten outreach ");
    });

    streamController.enqueue(
      encoder.encode(
        `event: body_delta\ndata: {"type":"body_delta","recipientId":"${recipientId}","chunk":"body for North Clinic."}\n\n`,
      ),
    );
    streamController.enqueue(
      encoder.encode(
        `event: final\ndata: {"type":"final","recipientId":"${recipientId}","body":"Rewritten outreach body for North Clinic."}\n\n`,
      ),
    );
    streamController.close();

    await waitFor(() => {
      expect(screen.getAllByLabelText("Body")[0]).toHaveValue(
        "Rewritten outreach body for North Clinic.",
      );
    });
  });

  it("keeps the regenerate modal open when kickoff is blocked", async () => {
    const user = userEvent.setup();
    seedCampaign();
    useAiSettingsStore.getState().clearProviderSettings("openai");
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    renderCampaignBuilderPage();

    await user.click(screen.getAllByRole("button", { name: "Regenerate with prompt" })[0]);
    expect(screen.getByRole("heading", { name: "Regenerate with prompt" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Regenerate email" }));

    expect(screen.getByRole("heading", { name: "Regenerate with prompt" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Generating..." })).not.toBeInTheDocument();
  });

  it("regenerates the global subject and body from edit global message", async () => {
    const user = userEvent.setup();
    seedCampaign();
    useAiSettingsStore.getState().setProviderApiKey("openai", "sk-test-openai");

    // Create a mock SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'event: done\ndata: {"type":"done","data":{"body":"Hi {{clinic_name}},\\n\\nHere is a sharper reusable template."}}\n\n',
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: {
        get: (name: string) => (name === "content-type" ? "text/event-stream" : null),
      },
    });

    vi.stubGlobal("fetch", fetchMock);

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Edit global message" }));
    await screen.findByRole("heading", { name: "Edit global message" });

    await user.click(screen.getByRole("button", { name: "Regenerate with prompt" }));
    expect(screen.getByRole("heading", { name: "Regenerate with prompt" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue(
      DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT,
    );

    await user.click(screen.getByRole("button", { name: "Regenerate global message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/regenerate-global-template",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Regenerate with prompt" }),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("Global subject")).toHaveValue(
      "Helping {{clinic_name}} reduce no-shows",
    );
    expect(screen.getByLabelText("Global body template")).toHaveValue(
      "Hi {{clinic_name}},\n\nHere is a sharper reusable template.",
    );

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestBody =
      typeof requestInit?.body === "string" ? JSON.parse(requestInit.body) : undefined;

    expect(requestBody).toMatchObject({
      globalSubject: "Helping {{clinic_name}} reduce no-shows",
      prompt: DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT,
      provider: "openai",
      apiKey: "sk-test-openai",
      detectedRecipientPlaceholder: "clinic_name",
    });
    expect(requestBody.availablePlaceholders).toContain("clinic_name");
    expect(requestBody.availablePlaceholders).toContain("address");
  });

  it("shows the saved workbook in the reupload dialog and restores it", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile.mockResolvedValue(makePreview());
    await saveUploadedWorkbook(
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "saved-reupload.csv", {
        type: "text/csv",
      }),
    );
    seedCampaign();

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Reupload new" }));

    expect(screen.getByRole("heading", { name: "Reupload workbook" })).toBeInTheDocument();
    expect(screen.getAllByText("saved-reupload.csv").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Use saved file" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Reupload workbook" }),
      ).not.toBeInTheDocument();
    });
    await screen.findByText("Review imported rows");
    expect(mockedParseWorkbookFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "saved-reupload.csv",
      }),
    );
  });

  it("adds new files from reupload on top of the saved upload set", async () => {
    const user = userEvent.setup();
    const mockedParseWorkbookFile = vi.mocked(parseWorkbookFile);
    mockedParseWorkbookFile
      .mockResolvedValueOnce(makePreview())
      .mockResolvedValueOnce(makeAdditionalPreview());
    await saveUploadedWorkbook(
      new File(["email,clinic_name\nnorth@example.com,North Clinic"], "leads.csv", {
        type: "text/csv",
      }),
    );
    seedCampaign();

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Reupload new" }));
    await user.click(screen.getByRole("button", { name: "Add new files" }));

    fireEvent.change(screen.getByLabelText("Reupload files"), {
      target: {
        files: [
          new File(
            ["email,clinic_name\nwest@example.com,West Clinic"],
            "extra-leads.csv",
            {
              type: "text/csv",
            },
          ),
        ],
      },
    });

    await screen.findByText("Review imported rows");
    await waitFor(() => {
      expect(screen.getByText("6 rows")).toBeInTheDocument();
      expect(screen.getByText("3 valid")).toBeInTheDocument();
      expect(screen.getByText("3 invalid")).toBeInTheDocument();
    });
    expect(screen.getAllByText("leads.csv + 1 more").length).toBeGreaterThan(0);
    expect(screen.getByText("extra-leads.csv · Row 3")).toBeInTheDocument();
    expect(loadUploadedWorkbook()).toMatchObject({
      files: [
        expect.objectContaining({ fileName: "leads.csv" }),
        expect.objectContaining({ fileName: "extra-leads.csv" }),
      ],
    });
  });

  it("applies send results from the mocked bulk send endpoint", async () => {
    const user = userEvent.setup();
    seedCampaign();

    vi.mocked(sendBulk).mockResolvedValueOnce({
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
    });

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Send selected" }));

    await waitFor(() => {
      expect(screen.getByText("1 sent")).toBeInTheDocument();
      expect(screen.getByText("1 failed")).toBeInTheDocument();
      expect(screen.getByText("Mailbox full")).toBeInTheDocument();
    });
  });

  it("shows a loading indicator while the batch is being sent", async () => {
    const user = userEvent.setup();
    seedCampaign();
    let resolveSend!: (value: BulkSendResponseData) => void;

    vi.mocked(sendBulk).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }) as Promise<Awaited<ReturnType<typeof sendBulk>>>,
    );

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Send selected" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
      expect(
        screen.getByText(/Sending is in progress\. Keep this tab open while 0\/2 emails finish processing\./i),
      ).toBeInTheDocument();
      expect(screen.getAllByText("Sending now").length).toBeGreaterThan(0);
    });

    resolveSend({
      sendJobId: "sendjob_mocked",
      results: [
        {
          recipientId: useCampaignStore.getState().recipientOrder[0],
          status: "sent",
          providerMessageId: "gmail_mocked_1",
        },
        {
          recipientId: useCampaignStore.getState().recipientOrder[1],
          status: "sent",
          providerMessageId: "gmail_mocked_2",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByText(/Sending is in progress\./i)).not.toBeInTheDocument();
      expect(screen.getByText("2 sent")).toBeInTheDocument();
    });
  });

  it("saves the sent and unsent view in browser storage after sending", async () => {
    const user = userEvent.setup();
    seedCampaign();
    const [sentRecipientId, unsentRecipientId] = useCampaignStore.getState().recipientOrder;

    vi.mocked(sendBulk).mockResolvedValueOnce({
      sendJobId: "sendjob_mocked",
      results: [
        {
          recipientId: sentRecipientId,
          status: "sent",
          providerMessageId: "gmail_mocked_1",
        },
        {
          recipientId: unsentRecipientId,
          status: "failed",
          errorMessage: "Mailbox full",
        },
      ],
    });

    renderCampaignBuilderPage();

    await user.click(screen.getByRole("button", { name: "Send selected" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sent 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unsent 1" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Sent 1" }));

    await waitFor(() => {
      expect(screen.getByText("North Clinic")).toBeInTheDocument();
      expect(screen.queryByText("South Clinic")).not.toBeInTheDocument();
    });

    const persistedStore = JSON.parse(
      localStorage.getItem("campaign-browser-storage") ?? "null",
    );

    expect(persistedStore.state.ui.recipientStatusView).toBe("sent");
    expect(persistedStore.state.recipientsById[sentRecipientId].sent).toBe(true);
    expect(persistedStore.state.recipientsById[unsentRecipientId].sent).toBe(false);
  });
});
