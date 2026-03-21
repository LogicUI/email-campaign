import { describe, expect, it, vi } from "vitest";

import { POST } from "@/api/database/connection/connect/route";

vi.mock("@/api/_lib/app-user", () => ({
  requireAppUser: vi.fn(),
}));

vi.mock("@/core/database/postgres-connector", () => ({
  listPostgresTables: vi.fn(),
  normalizeConnectionProfile: vi.fn(),
  testPostgresConnection: vi.fn(),
}));

vi.mock("@/core/persistence/connection-profiles-repo", () => ({
  upsertConnectionProfile: vi.fn(),
}));

const { requireAppUser } = await import("@/api/_lib/app-user");
const { listPostgresTables, normalizeConnectionProfile, testPostgresConnection } =
  await import("@/core/database/postgres-connector");
const { upsertConnectionProfile } = await import("@/core/persistence/connection-profiles-repo");

describe("POST /api/database/connection/connect", () => {
  it("connects, persists the profile, and returns tables", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      session: {
        user: {
          email: "owner@example.com",
        },
      },
      userId: "user_1",
    } as never);
    vi.mocked(testPostgresConnection).mockResolvedValueOnce({
      current_database: "postgres",
      current_schema: "public",
      current_user: "postgres",
    });
    vi.mocked(normalizeConnectionProfile).mockReturnValueOnce({
      label: "Primary Supabase",
      displayHost: "db.supabase.co",
      displayDatabaseName: "postgres",
      displayProjectRef: "db",
    });
    vi.mocked(upsertConnectionProfile).mockResolvedValueOnce({
      id: "dbprofile_1",
      provider: "supabase",
      label: "Primary Supabase",
      displayHost: "db.supabase.co",
      displayDatabaseName: "postgres",
      displayProjectRef: "db",
      syncMode: "auto",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      lastUsedAt: "2026-03-21T00:00:00.000Z",
      lastSyncedAt: undefined,
    });
    vi.mocked(listPostgresTables).mockResolvedValueOnce([
      {
        schema: "public",
        name: "contacts",
        displayName: "public.contacts",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/database/connection/connect", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "Primary Supabase",
            connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            syncMode: "auto",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        connectionProfile: {
          id: "dbprofile_1",
          provider: "supabase",
          label: "Primary Supabase",
          displayHost: "db.supabase.co",
          displayDatabaseName: "postgres",
          displayProjectRef: "db",
          syncMode: "auto",
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          lastUsedAt: "2026-03-21T00:00:00.000Z",
          lastSyncedAt: undefined,
        },
        tables: [
          {
            schema: "public",
            name: "contacts",
            displayName: "public.contacts",
          },
        ],
      },
    });
    expect(testPostgresConnection).toHaveBeenCalledTimes(1);
    expect(upsertConnectionProfile).toHaveBeenCalledTimes(1);
    expect(listPostgresTables).toHaveBeenCalledTimes(1);
  });

  it("returns a validation error before connector work", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      session: {
        user: {
          email: "owner@example.com",
        },
      },
      userId: "user_1",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/database/connection/connect", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "",
            connectionString: "",
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(testPostgresConnection).not.toHaveBeenCalled();
    expect(upsertConnectionProfile).not.toHaveBeenCalled();
    expect(listPostgresTables).not.toHaveBeenCalled();
  });

  it("returns connector errors without persisting", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      session: {
        user: {
          email: "owner@example.com",
        },
      },
      userId: "user_1",
    } as never);
    vi.mocked(testPostgresConnection).mockRejectedValueOnce(
      new Error("Database connection failed."),
    );

    const response = await POST(
      new Request("http://localhost/api/database/connection/connect", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "Primary Supabase",
            connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            syncMode: "auto",
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertConnectionProfile).not.toHaveBeenCalled();
    expect(listPostgresTables).not.toHaveBeenCalled();
  });
});
