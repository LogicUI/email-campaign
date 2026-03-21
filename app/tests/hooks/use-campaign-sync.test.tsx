import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCampaignSync } from "@/hooks/use-campaign-sync";
import type { Campaign, CampaignRecipient } from "@/types/campaign";
import type { DatabaseSessionConnection } from "@/types/database";

vi.mock("@/store/campaign-store", () => ({
  useCampaignStore: vi.fn(),
}));

vi.mock("@/store/database-session-store", () => ({
  useDatabaseSessionStore: vi.fn(),
}));

vi.mock("@/tanStack/campaigns", () => ({
  useSaveCampaignMutation: vi.fn(),
}));

vi.mock("@/tanStack/database", () => ({
  useConnectDatabaseMutation: vi.fn(),
}));

const { useCampaignStore } = await import("@/store/campaign-store");
const { useDatabaseSessionStore } = await import("@/store/database-session-store");
const { useSaveCampaignMutation } = await import("@/tanStack/campaigns");
const { useConnectDatabaseMutation } = await import("@/tanStack/database");

const campaign: Campaign = {
  id: "campaign_1",
  name: "Clinic outreach",
  globalSubject: "Hello",
  globalBodyTemplate: "Body",
  createdAt: "2026-03-21T00:00:00.000Z",
  sourceType: "uploaded_list",
  importedFileName: "leads.csv",
  totalRows: 2,
  validRows: 1,
  invalidRows: 1,
};

const recipients: CampaignRecipient[] = [
  {
    id: "recipient_1",
    rowIndex: 1,
    source: "imported",
    email: "north@example.com",
    subject: "Hello",
    body: "Body",
    checked: true,
    sent: false,
    status: "draft",
    fields: {},
    bodySource: "manual",
    manualEditsSinceGenerate: false,
    isRegenerating: false,
    regenerationPhase: "idle",
    isSending: false,
  },
];

describe("useCampaignSync", () => {
  const sessionState: {
    activeConnection: DatabaseSessionConnection | null;
  } = {
    activeConnection: {
      provider: "supabase",
      label: "Primary Supabase",
      connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
      syncMode: "manual",
    },
  };

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
    sessionState.activeConnection = {
      provider: "supabase",
      label: "Primary Supabase",
      connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
      syncMode: "manual",
    };
    updateActiveConnection.mockClear();

    vi.mocked(useDatabaseSessionStore).mockImplementation((selector) =>
      selector({
        activeConnection: sessionState.activeConnection,
        updateActiveConnection,
        editedImportSchema: null,
        setEditedImportSchema: vi.fn(),
        clearEditedImportSchema: vi.fn(),
        setActiveConnection: vi.fn(),
        clearActiveConnection: vi.fn(),
      }),
    );
    vi.mocked(useCampaignStore).mockImplementation((selector) =>
      selector({
        campaign,
        importPreview: null,
        generationLogs: [],
        recipientOrder: recipients.map((recipient) => recipient.id),
        recipientsById: Object.fromEntries(recipients.map((recipient) => [recipient.id, recipient])),
        ui: {
          composeDialogOpen: false,
          currentPage: 1,
          pageSize: 10,
          recipientStatusView: "unsent",
          isImporting: false,
          isSending: false,
          isDatabaseSyncing: false,
          needsDatabaseSync: true,
          lastDatabaseSyncAt: undefined,
          lastDatabaseSyncError: undefined,
          sendProgress: { completed: 0, total: 0, success: 0, failed: 0 },
        },
        markDatabaseSyncFailed: vi.fn(),
        markDatabaseSyncPending: vi.fn(),
        markDatabaseSyncStarted: vi.fn(),
        markDatabaseSyncSucceeded: vi.fn(),
      } as any),
    );
  });

  it("persists the active connection before manual sync when the session has no profile id", async () => {
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
    const saveCampaignMutateAsync = vi.fn().mockResolvedValue({
      syncedAt: "2026-03-21T01:00:00.000Z",
    });

    vi.mocked(useConnectDatabaseMutation).mockReturnValue({
      mutateAsync: connectMutateAsync,
    } as never);
    vi.mocked(useSaveCampaignMutation).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: saveCampaignMutateAsync,
    } as never);

    const { result } = renderHook(() => useCampaignSync());

    expect(result.current.canSyncCurrentCampaign).toBe(true);

    await act(async () => {
      await result.current.syncCurrentCampaign();
    });

    expect(connectMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Primary Supabase",
      }),
    );
    expect(saveCampaignMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "dbprofile_live",
      }),
    );
    expect(sessionState.activeConnection).toMatchObject({
      profileId: "dbprofile_live",
    });
  });
});
