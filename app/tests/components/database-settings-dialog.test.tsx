import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseSettingsDialog } from "@/components/settings/database-settings-dialog";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import type { ImportPreview } from "@/types/campaign";

vi.mock("@/hooks/use-database-settings", () => ({
  useDatabaseSettings: vi.fn(),
}));

vi.mock("@/tanStack/database", () => ({
  useDescribeDatabaseTableMutation: vi.fn(),
  useSaveDatabaseImportMutation: vi.fn(),
}));

const { useDatabaseSettings } = await import("@/hooks/use-database-settings");
const { useDescribeDatabaseTableMutation, useSaveDatabaseImportMutation } = await import(
  "@/tanStack/database"
);

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
  beforeEach(() => {
    useDatabaseSessionStore.getState().clearActiveConnection();
    useDatabaseSessionStore.getState().clearEditedImportSchema();

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
    vi.mocked(useSaveDatabaseImportMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    } as never);
  });

  it("renders separate test and connect actions", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(buildDatabaseSettingsState() as never);

    render(<DatabaseSettingsDialog open onOpenChange={vi.fn()} initialProfiles={[]} />);

    expect(screen.getByRole("button", { name: "Test connection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect browser session" })).toBeDisabled();
  });

  it("does not hit a maximum update depth loop when import mode opens", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(useDatabaseSettings).mockImplementation(
      () =>
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
    vi.mocked(useDescribeDatabaseTableMutation).mockImplementation(
      () =>
        ({
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
        }) as never,
    );
    vi.mocked(useSaveDatabaseImportMutation).mockImplementation(
      () =>
        ({
          error: null,
          isPending: false,
          mutateAsync: vi.fn(),
          reset: vi.fn(),
        }) as never,
    );

    const { rerender } = render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
        origin="database-import"
        importPreview={buildImportPreview()}
      />,
    );

    rerender(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
        origin="database-import"
        importPreview={buildImportPreview()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Connect & Save Import")).toBeInTheDocument();
    });

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((value) => String(value).includes("Maximum update depth exceeded")),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });

  it("enables connect only when the hook says the current draft passed a test", async () => {
    const user = userEvent.setup();

    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        isConnectionReadyToConnect: vi.fn().mockReturnValue(true),
      }) as never,
    );

    render(<DatabaseSettingsDialog open onOpenChange={vi.fn()} initialProfiles={[]} />);

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

    render(<DatabaseSettingsDialog open onOpenChange={vi.fn()} initialProfiles={[]} />);

    await user.type(screen.getByLabelText("Connection string"), "postgresql://db.example.com");

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
      label: "Supabase connection · 127.0.0.1",
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

    render(<DatabaseSettingsDialog open onOpenChange={vi.fn()} initialProfiles={[]} />);

    expect(screen.getByText("Connection test passed")).toBeInTheDocument();
  });

  it("renders saved profiles and tables in general settings", () => {
    vi.mocked(useDatabaseSettings).mockReturnValue(
      buildDatabaseSettingsState({
        activeConnection: {
          provider: "supabase",
          label: "Supabase connection · 127.0.0.1",
          connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
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

    render(<DatabaseSettingsDialog open onOpenChange={vi.fn()} initialProfiles={[]} />);

    expect(screen.getByText("Saved connection profiles")).toBeInTheDocument();
    expect(screen.getByText("Available tables")).toBeInTheDocument();
    expect(screen.queryByLabelText("Connection label")).not.toBeInTheDocument();
  });

  it("renders uploaded spreadsheet preview and import destination controls during the import flow", async () => {
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

    expect(screen.getByLabelText("Destination")).toBeInTheDocument();
    expect(screen.queryByLabelText("Append to existing table (check duplicates)")).not.toBeInTheDocument();
    expect(screen.getByText("Saved connection profiles")).toBeInTheDocument();
    expect(screen.getByText("Mapped sample preview")).toBeInTheDocument();
  });

  it("saves the import from the import flow and passes the response back", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      savedList: {
        id: "saved_list_1",
        name: "leads.xlsx list",
        sourceFileLabel: "leads.xlsx",
        rowCount: 2,
        validRowCount: 1,
        invalidRowCount: 1,
        createdAt: "2026-03-21T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
        schemaSnapshot: {
          headers: ["email", "clinic_name", "status"],
        },
        rows: [],
      },
      destinationTableName: "public.leads",
      sourceRowCount: 2,
      eligibleRowCount: 1,
      insertedCount: 1,
      skippedRowCount: 1,
      tableSchema: null,
    });
    const onImportSaved = vi.fn();

    vi.mocked(useSaveDatabaseImportMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync,
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

    render(
      <DatabaseSettingsDialog
        open
        onOpenChange={vi.fn()}
        initialProfiles={[]}
        origin="database-import"
        importPreview={buildImportPreview()}
        onImportSaved={onImportSaved}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save import" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Save import" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "existing_table",
        saveName: "leads.xlsx list",
        existingTable: {
          schema: "public",
          name: "leads",
          displayName: "public.leads",
        },
      }),
    );
    await screen.findByText("Inserted 1 row(s) into public.leads.");
    expect(onImportSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        savedList: expect.objectContaining({
          id: "saved_list_1",
        }),
      }),
    );
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});
