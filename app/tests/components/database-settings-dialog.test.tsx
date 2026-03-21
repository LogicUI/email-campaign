import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseSettingsDialog } from "@/components/settings/database-settings-dialog";
import type { ImportPreview } from "@/types/campaign";

vi.mock("@/hooks/use-database-settings", () => ({
  useDatabaseSettings: vi.fn(),
}));

vi.mock("@/hooks/use-campaign-sync", () => ({
  useCampaignSync: vi.fn(),
}));

vi.mock("@/tanStack/database", () => ({
  useDescribeDatabaseTableMutation: vi.fn(),
}));

const { useDatabaseSettings } = await import("@/hooks/use-database-settings");
const { useCampaignSync } = await import("@/hooks/use-campaign-sync");
const { useDescribeDatabaseTableMutation } = await import("@/tanStack/database");

function buildDatabaseSettingsState(overrides: Record<string, unknown> = {}) {
  return {
    activeConnection: null,
    clearActiveConnection: vi.fn(),
    connectConnection: vi.fn().mockResolvedValue(undefined),
    error: null,
    invalidateConnectionTest: vi.fn(),
    isConnectingConnection: false,
    isConnectionReadyToConnect: vi.fn().mockReturnValue(false),
    isLoadingTables: false,
    isTestingConnection: false,
    profiles: [],
    successKind: null,
    successMessage: null,
    tables: [],
    testConnection: vi.fn().mockResolvedValue(undefined),
    updateSyncMode: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildImportPreview(): ImportPreview {
  return {
    fileName: "leads.xlsx",
    sourceFiles: [
      {
        fileName: "leads.xlsx",
        sheetName: "Sheet1",
      },
    ],
    sourceRows: [
      {
        raw: { email: "north@example.com", clinic_name: "North Clinic", status: "active" },
        sourceFileName: "leads.xlsx",
        originalRowIndex: 2,
      },
      {
        raw: { email: "bad-email", clinic_name: "Broken Clinic", status: "invalid" },
        sourceFileName: "leads.xlsx",
        originalRowIndex: 3,
      },
    ],
    headers: ["email", "clinic_name", "status"],
    rows: [
      {
        tempId: "row_1",
        rowIndex: 2,
        email: "north@example.com",
        recipient: "North Clinic",
        sourceFileName: "leads.xlsx",
        isValid: true,
        fields: {},
        raw: { email: "north@example.com", clinic_name: "North Clinic", status: "active" },
      },
      {
        tempId: "row_2",
        rowIndex: 3,
        email: "bad-email",
        recipient: "Broken Clinic",
        sourceFileName: "leads.xlsx",
        isValid: false,
        invalidReason: "Invalid email format.",
        fields: {},
        raw: { email: "bad-email", clinic_name: "Broken Clinic", status: "invalid" },
      },
    ],
    validCount: 1,
    invalidCount: 1,
    candidateEmailColumns: ["email"],
    candidateRecipientColumns: ["clinic_name"],
    selectedEmailColumn: "email",
    selectedRecipientColumn: "clinic_name",
  };
}

describe("DatabaseSettingsDialog", () => {
  const syncState = {
    canSyncCurrentCampaign: false,
    error: null,
    isSyncing: false,
    lastSyncedAt: undefined,
    needsSync: false,
    syncCurrentCampaign: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useDescribeDatabaseTableMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({
        schema: {
          table: {
            schema: "public",
            name: "leads",
            displayName: "public.leads",
          },
          columns: [
            { name: "email", type: "text", nullable: false },
            { name: "clinic_name", type: "text", nullable: true },
          ],
        },
        suggestedMappings: [],
      }),
      reset: vi.fn(),
    } as never);
  });

  it("renders separate test and connect actions", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(buildDatabaseSettingsState() as never);
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Test connection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect browser session" })).toBeDisabled();
  });

  it("enables connect only when the hook says the current draft passed a test", async () => {
    const user = userEvent.setup();

    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        isConnectionReadyToConnect: vi.fn().mockReturnValue(true),
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    await user.type(
      screen.getByLabelText("Connection string"),
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );

    expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled();
  });

  it("invalidates the prior test state when the user edits the form", async () => {
    const user = userEvent.setup();
    const invalidateConnectionTest = vi.fn();

    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        invalidateConnectionTest,
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    await user.type(screen.getByLabelText("Connection label"), " 2");

    expect(invalidateConnectionTest).toHaveBeenCalled();
  });

  it("passes the current draft to connect and refreshes parent data", async () => {
    const user = userEvent.setup();
    const connectConnection = vi.fn().mockResolvedValue(undefined);
    const onProfilesUpdated = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        connectConnection,
        isConnectionReadyToConnect: vi.fn().mockReturnValue(true),
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
        onProfilesUpdated={onProfilesUpdated}
      />,
    );

    await user.type(
      screen.getByLabelText("Connection string"),
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(connectConnection).toHaveBeenCalledWith({
      provider: "supabase",
      label: "Primary Supabase",
      connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      syncMode: "auto",
    });
    expect(onProfilesUpdated).toHaveBeenCalledTimes(1);
  });

  it("changes the success alert title based on the hook state", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        successKind: "test",
        successMessage:
          "Connection test passed. Click Connect to use this database in the current browser session.",
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    expect(screen.getByText("Connection test passed")).toBeInTheDocument();
  });

  it("renders explicit Supabase pooler guidance", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(buildDatabaseSettingsState() as never);
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    expect(screen.getByText("Supabase pooler supported")).toBeInTheDocument();
    expect(
      screen.getByText(
        /postgresql:\/\/postgres\.<project-ref>:<password>@aws-0-<region>\.pooler\.supabase\.com:5432\/postgres/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Supabase pooler URLs are supported\. Paste the Session pooler DSN/i),
    ).toBeInTheDocument();
  });

  it("keeps sync mode available for a live session even before a profile id is repaired", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        activeConnection: {
          provider: "supabase",
          label: "Primary Supabase",
          connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
          syncMode: "auto",
        },
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
      />,
    );

    expect(screen.getByLabelText("Send history sync")).toBeEnabled();
  });

  it("renders uploaded spreadsheet and destination previews during the import flow", async () => {
    const describeMutateAsync = vi.fn().mockResolvedValue({
      schema: {
        table: {
          schema: "public",
          name: "leads",
          displayName: "public.leads",
        },
        columns: [
          { name: "email", type: "text", nullable: false },
          { name: "clinic_name", type: "text", nullable: true },
        ],
      },
      suggestedMappings: [],
    });

    vi.mocked(useDescribeDatabaseTableMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: describeMutateAsync,
      reset: vi.fn(),
    } as never);
    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        activeConnection: {
          provider: "supabase",
          label: "Primary Supabase",
          connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
          profileId: "dbprofile_1",
          syncMode: "auto",
        },
        profiles: [
          {
            id: "dbprofile_1",
            provider: "supabase",
            label: "Primary Supabase",
            displayHost: "127.0.0.1",
            displayDatabaseName: "postgres",
            lastSelectedTable: "public.leads",
            syncMode: "auto",
            createdAt: "2026-03-21T00:00:00.000Z",
            updatedAt: "2026-03-21T00:00:00.000Z",
            lastUsedAt: "2026-03-21T00:00:00.000Z",
          },
        ],
        tables: [
          {
            schema: "public",
            name: "leads",
            displayName: "public.leads",
          },
        ],
      }) as never,
    );
    vi.mocked(useCampaignSync).mockReturnValue(syncState as never);

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
        origin="database-import"
        importPreview={buildImportPreview()}
      />,
    );

    expect(screen.getByText("Uploaded spreadsheet preview")).toBeInTheDocument();
    expect(screen.getByText("North Clinic")).toBeInTheDocument();

    await waitFor(() => {
      expect(describeMutateAsync).toHaveBeenCalledWith({
        schema: "public",
        name: "leads",
        displayName: "public.leads",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Table schema")).toBeInTheDocument();
    });

    expect(screen.getByText("Destination preview")).toBeInTheDocument();
    expect(screen.getAllByText("clinic_name").length).toBeGreaterThan(0);
    expect(screen.getByText("Mapped sample rows")).toBeInTheDocument();
  });
});
