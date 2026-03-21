import { describe, expect, it, vi } from "vitest";

import { POST } from "@/api/database/imports/save/route";

vi.mock("@/api/_lib/app-user", () => ({
  requireAppUser: vi.fn(),
}));

vi.mock("@/core/database/postgres-connector", () => ({
  buildSuggestedMappings: vi.fn(),
  createPostgresTable: vi.fn(),
  describePostgresTable: vi.fn(),
  inferPostgresColumns: vi.fn(),
  insertRowsIntoPostgresTable: vi.fn(),
  normalizeConnectionProfile: vi.fn(),
}));

vi.mock("@/core/persistence/connection-profiles-repo", () => ({
  upsertConnectionProfile: vi.fn(),
}));

vi.mock("@/core/persistence/saved-lists-repo", () => ({
  saveImportPreviewAsList: vi.fn(),
}));

const { requireAppUser } = await import("@/api/_lib/app-user");
const { insertRowsIntoPostgresTable, normalizeConnectionProfile } = await import(
  "@/core/database/postgres-connector"
);
const { upsertConnectionProfile } = await import("@/core/persistence/connection-profiles-repo");
const { saveImportPreviewAsList } = await import("@/core/persistence/saved-lists-repo");

describe("POST /api/database/imports/save", () => {
  it("returns source, eligible, inserted, and skipped row counts for existing-table saves", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      userId: "user_1",
    } as never);
    vi.mocked(normalizeConnectionProfile).mockReturnValue({
      label: "Primary Supabase",
      displayHost: "127.0.0.1",
      displayDatabaseName: "postgres",
    } as never);
    vi.mocked(upsertConnectionProfile).mockResolvedValueOnce({
      id: "dbprofile_1",
    } as never);
    vi.mocked(insertRowsIntoPostgresTable).mockResolvedValueOnce({
      insertedCount: 1,
    } as never);
    vi.mocked(saveImportPreviewAsList).mockResolvedValueOnce({
      id: "saved_list_1",
      name: "Leads list",
      sourceFileLabel: "leads.csv",
      rowCount: 2,
      validRowCount: 1,
      invalidRowCount: 1,
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      schemaSnapshot: {
        headers: ["email"],
      },
      rows: [],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/database/imports/save", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "Primary Supabase",
            connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
            syncMode: "auto",
          },
          saveName: "Leads list",
          preview: {
            fileName: "leads.csv",
            sourceFiles: [
              {
                fileName: "leads.csv",
              },
            ],
            sourceRows: [],
            headers: ["email"],
            rows: [
              {
                tempId: "row_1",
                rowIndex: 2,
                email: "north@example.com",
                sourceFileName: "leads.csv",
                isValid: true,
                fields: {},
                raw: {
                  email: "north@example.com",
                },
              },
              {
                tempId: "row_2",
                rowIndex: 3,
                email: "bad-email",
                sourceFileName: "leads.csv",
                isValid: false,
                invalidReason: "Invalid email format.",
                fields: {},
                raw: {
                  email: "bad-email",
                },
              },
            ],
            validCount: 1,
            invalidCount: 1,
            candidateEmailColumns: ["email"],
            candidateRecipientColumns: [],
          },
          mode: "existing_table",
          existingTable: {
            schema: "public",
            name: "leads",
            displayName: "public.leads",
          },
          mappings: [
            {
              sourceColumn: "email",
              destinationColumn: "email",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        savedList: expect.objectContaining({
          id: "saved_list_1",
        }),
        destinationTableName: "public.leads",
        sourceRowCount: 2,
        eligibleRowCount: 1,
        insertedCount: 1,
        skippedRowCount: 1,
      },
    });
  });
});
