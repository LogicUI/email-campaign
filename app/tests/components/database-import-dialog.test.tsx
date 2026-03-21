import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatabaseImportDialog } from "@/components/campaign/database-import-dialog";
import type { ImportPreview } from "@/types/campaign";

vi.mock("@/tanStack/database", () => ({
  useDatabaseTablesQuery: vi.fn(),
  useDescribeDatabaseTableMutation: vi.fn(),
  useSaveDatabaseImportMutation: vi.fn(),
}));

const {
  useDatabaseTablesQuery,
  useDescribeDatabaseTableMutation,
  useSaveDatabaseImportMutation,
} = await import("@/tanStack/database");

function makePreview(): ImportPreview {
  return {
    fileName: "leads.csv",
    sourceFiles: [
      {
        fileName: "leads.csv",
      },
    ],
    sourceRows: [
      {
        raw: { email: "north@example.com", clinic_name: "North Clinic", status: "active" },
        sourceFileName: "leads.csv",
        originalRowIndex: 2,
      },
      {
        raw: { email: "bad-email", clinic_name: "Broken Clinic", status: "invalid" },
        sourceFileName: "leads.csv",
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
        sourceFileName: "leads.csv",
        isValid: true,
        fields: {},
        raw: { email: "north@example.com", clinic_name: "North Clinic", status: "active" },
      },
      {
        tempId: "row_2",
        rowIndex: 3,
        email: "bad-email",
        recipient: "Broken Clinic",
        sourceFileName: "leads.csv",
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

describe("DatabaseImportDialog", () => {
  it("preselects the last used table and shows schema plus mapped sample rows", async () => {
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

    vi.mocked(useDatabaseTablesQuery).mockReturnValue({
      data: [
        {
          schema: "public",
          name: "leads",
          displayName: "public.leads",
        },
      ],
      error: null,
      isFetching: false,
      isPending: false,
    } as never);
    vi.mocked(useDescribeDatabaseTableMutation).mockReturnValue({
      error: null,
      mutateAsync: describeMutateAsync,
      reset: vi.fn(),
    } as never);
    vi.mocked(useSaveDatabaseImportMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    } as never);

    const dialogProps = {
      onOpenChange: vi.fn(),
      preview: makePreview(),
      activeConnection: {
        provider: "supabase" as const,
        label: "Primary Supabase",
        connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
        profileId: "dbprofile_1",
        syncMode: "auto" as const,
      },
      connectionProfiles: [
        {
          id: "dbprofile_1",
          provider: "supabase" as const,
          label: "Primary Supabase",
          displayHost: "127.0.0.1",
          displayDatabaseName: "postgres",
          lastSelectedTable: "public.leads",
          syncMode: "auto" as const,
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          lastUsedAt: "2026-03-21T00:00:00.000Z",
        },
      ],
      onOpenDatabaseSettings: vi.fn(),
      onSaved: vi.fn(),
    };

    const { rerender } = render(
      <DatabaseImportDialog
        open={false}
        {...dialogProps}
      />,
    );

    rerender(
      <DatabaseImportDialog
        open
        {...dialogProps}
      />,
    );

    await waitFor(() => {
      expect(describeMutateAsync).toHaveBeenCalledWith({
        schema: "public",
        name: "leads",
        displayName: "public.leads",
      });
    });

    expect(screen.getByDisplayValue("public.leads")).toBeInTheDocument();
    expect(screen.getByText("Table schema")).toBeInTheDocument();
    expect(screen.getAllByText("clinic_name").length).toBeGreaterThan(0);
    expect(screen.getByText("Mapped sample preview")).toBeInTheDocument();
    expect(screen.getByText("North Clinic")).toBeInTheDocument();
    expect(screen.getByText("1 row(s) will be inserted.")).toBeInTheDocument();
    expect(screen.getByText("1 invalid row(s) will be skipped.")).toBeInTheDocument();
  });

  it("stays open after save and shows inserted plus skipped row counts", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    const saveMutateAsync = vi.fn().mockResolvedValue({
      savedList: {
        id: "saved_list_1",
        name: "Leads list",
        sourceFileLabel: "leads.csv",
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

    vi.mocked(useDatabaseTablesQuery).mockReturnValue({
      data: [
        {
          schema: "public",
          name: "leads",
          displayName: "public.leads",
        },
      ],
      error: null,
      isFetching: false,
      isPending: false,
    } as never);
    vi.mocked(useDescribeDatabaseTableMutation).mockReturnValue({
      error: null,
      mutateAsync: vi.fn().mockResolvedValue({
        schema: {
          table: {
            schema: "public",
            name: "leads",
            displayName: "public.leads",
          },
          columns: [
            { name: "email", type: "text", nullable: false },
          ],
        },
        suggestedMappings: [],
      }),
      reset: vi.fn(),
    } as never);
    vi.mocked(useSaveDatabaseImportMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: saveMutateAsync,
      reset: vi.fn(),
    } as never);

    const dialogProps = {
      onOpenChange,
      preview: makePreview(),
      activeConnection: {
        provider: "supabase" as const,
        label: "Primary Supabase",
        connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
        profileId: "dbprofile_1",
        syncMode: "auto" as const,
      },
      connectionProfiles: [
        {
          id: "dbprofile_1",
          provider: "supabase" as const,
          label: "Primary Supabase",
          displayHost: "127.0.0.1",
          displayDatabaseName: "postgres",
          lastSelectedTable: "public.leads",
          syncMode: "auto" as const,
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          lastUsedAt: "2026-03-21T00:00:00.000Z",
        },
      ],
      onOpenDatabaseSettings: vi.fn(),
      onSaved,
    };

    const { rerender } = render(
      <DatabaseImportDialog
        open={false}
        {...dialogProps}
      />,
    );

    rerender(
      <DatabaseImportDialog
        open
        {...dialogProps}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save import" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Save import" }));

    await screen.findByText("Inserted 1 row(s) into public.leads.");
    expect(screen.getByText("1 eligible from 2 source row(s), 1 skipped.")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "saved_list_1",
      }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});
