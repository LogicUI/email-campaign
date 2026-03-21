import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDatabaseSettings } from "@/hooks/use-database-settings";
import type { DatabaseSessionConnection } from "@/types/database";

vi.mock("@/store/database-session-store", () => ({
  useDatabaseSessionStore: vi.fn(),
}));

vi.mock("@/tanStack/database", () => ({
  useConnectDatabaseMutation: vi.fn(),
  useDatabaseTablesQuery: vi.fn(),
  useTestDatabaseConnectionMutation: vi.fn(),
  useUpdateDatabaseConnectionProfileMutation: vi.fn(),
}));

const { useDatabaseSessionStore } = await import("@/store/database-session-store");
const {
  useConnectDatabaseMutation,
  useDatabaseTablesQuery,
  useTestDatabaseConnectionMutation,
  useUpdateDatabaseConnectionProfileMutation,
} = await import("@/tanStack/database");

const baseConnection: DatabaseSessionConnection = {
  provider: "supabase",
  label: "Primary Supabase",
  connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
  profileId: "dbprofile_stale",
  syncMode: "auto",
};

describe("useDatabaseSettings", () => {
  const sessionState: {
    activeConnection: DatabaseSessionConnection | null;
  } = {
    activeConnection: { ...baseConnection },
  };

  const setActiveConnection = vi.fn((connection: DatabaseSessionConnection | null) => {
    sessionState.activeConnection = connection;
  });
  const clearActiveConnection = vi.fn(() => {
    sessionState.activeConnection = null;
  });
  const updateActiveConnection = vi.fn(
    (
      updater: (
        current: DatabaseSessionConnection | null,
      ) => DatabaseSessionConnection | null,
    ) => {
      sessionState.activeConnection = updater(sessionState.activeConnection);
    },
  );

  beforeEach(() => {
    sessionState.activeConnection = { ...baseConnection };
    setActiveConnection.mockClear();
    clearActiveConnection.mockClear();
    updateActiveConnection.mockClear();

    vi.mocked(useDatabaseSessionStore).mockImplementation((selector) =>
      selector({
        activeConnection: sessionState.activeConnection,
        setActiveConnection,
        clearActiveConnection,
        updateActiveConnection,
        editedImportSchema: null,
        setEditedImportSchema: vi.fn(),
        clearEditedImportSchema: vi.fn(),
      }),
    );
    vi.mocked(useDatabaseTablesQuery).mockReturnValue({
      data: [],
      error: null,
      isFetching: false,
      isPending: false,
    } as never);
    vi.mocked(useTestDatabaseConnectionMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    } as never);
  });

  it("reconnects transparently when the saved profile id is stale during sync-mode updates", async () => {
    const connectMutateAsync = vi.fn().mockResolvedValue({
      connectionProfile: {
        id: "dbprofile_live",
        provider: "supabase",
        label: "Primary Supabase",
        displayHost: "127.0.0.1",
        displayDatabaseName: "postgres",
        syncMode: "manual",
        createdAt: "2026-03-21T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
        lastUsedAt: "2026-03-21T00:00:00.000Z",
      },
      tables: [],
    });
    const updateSyncModeMutateAsync = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection profile not found."));

    vi.mocked(useConnectDatabaseMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: connectMutateAsync,
      reset: vi.fn(),
    } as never);
    vi.mocked(useUpdateDatabaseConnectionProfileMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateSyncModeMutateAsync,
      reset: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDatabaseSettings([]));

    await act(async () => {
      await result.current.updateSyncMode("dbprofile_stale", "manual");
    });

    expect(updateSyncModeMutateAsync).toHaveBeenCalledWith({
      profileId: "dbprofile_stale",
      syncMode: "manual",
    });
    expect(connectMutateAsync).toHaveBeenCalledWith({
      ...baseConnection,
      syncMode: "manual",
    });
    expect(sessionState.activeConnection).toMatchObject({
      profileId: "dbprofile_live",
      syncMode: "manual",
    });
  });
});
