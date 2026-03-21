"use client";

import { useCallback, useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import { useConnectDatabaseMutation } from "@/tanStack/database";
import { useSaveCampaignMutation } from "@/tanStack/campaigns";
import { selectCampaign, selectRecipientOrder, selectUi } from "@/store/selectors";
import type { CampaignRecipient } from "@/types/campaign";

interface SyncCampaignResult {
  syncedAt: string;
}

/**
 * Manages explicit or automatic syncing of the current campaign into the app database.
 *
 * This hook exists to keep database sync concerns out of the send hook and UI
 * components. It gathers the current campaign/recipient snapshot from the store,
 * posts it to the sync endpoint, and mirrors sync progress/errors back into the
 * campaign UI state so manual and auto-sync share one implementation.
 *
 * @param options.onSavedDataChange Optional callback used to refresh dashboard data
 * after a successful sync changes the persisted state.
 * @returns Sync state plus an imperative `syncCurrentCampaign` action.
 */
export function useCampaignSync(options?: {
  onSavedDataChange?: () => Promise<unknown> | void;
}) {
  const activeConnection = useDatabaseSessionStore((state) => state.activeConnection);
  const updateActiveConnection = useDatabaseSessionStore((state) => state.updateActiveConnection);
  const campaign = useCampaignStore(selectCampaign);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
  const recipientsById = useCampaignStore((state) => state.recipientsById);
  const ui = useCampaignStore(selectUi);
  const markDatabaseSyncFailed = useCampaignStore((state) => state.markDatabaseSyncFailed);
  const markDatabaseSyncPending = useCampaignStore((state) => state.markDatabaseSyncPending);
  const markDatabaseSyncStarted = useCampaignStore((state) => state.markDatabaseSyncStarted);
  const markDatabaseSyncSucceeded = useCampaignStore((state) => state.markDatabaseSyncSucceeded);
  const connectDatabaseMutation = useConnectDatabaseMutation();
  const saveCampaignMutation = useSaveCampaignMutation();

  const recipients = useMemo(
    () =>
      recipientOrder
        .map((id) => recipientsById[id])
        .filter((recipient): recipient is CampaignRecipient => Boolean(recipient)),
    [recipientOrder, recipientsById],
  );

  /**
   * Persists the current campaign snapshot to the app database.
   *
   * This is used both by the manual `Sync now` button and by the auto-sync branch
   * after bulk send completes. When no connected profile exists, the function can
   * either fail loudly or silently mark the campaign as pending sync based on the
   * caller's intent.
   *
   * @param syncOptions.sentAt Optional timestamp to associate with the synced snapshot.
   * @param syncOptions.silentWhenDisconnected When true, missing DB connection is treated
   * as a deferred sync state instead of a blocking error.
   * @returns Sync result with timestamp, or `null` if the sync did not run.
   */
  const syncCurrentCampaign = useCallback(
    async (syncOptions?: {
      sentAt?: string;
      silentWhenDisconnected?: boolean;
    }): Promise<SyncCampaignResult | null> => {
      if (!campaign) {
        return null;
      }

      if (!activeConnection) {
        if (syncOptions?.silentWhenDisconnected) {
          markDatabaseSyncPending();
          return null;
        }

        const message = "Connect a database profile before syncing.";
        markDatabaseSyncFailed(message);
        return null;
      }

      let profileId = activeConnection.profileId;

      if (!profileId) {
        const connectionResult = await connectDatabaseMutation.mutateAsync(activeConnection);
        profileId = connectionResult.connectionProfile.id;

        updateActiveConnection((current) =>
          current
            ? {
                ...current,
                profileId: connectionResult.connectionProfile.id,
                syncMode: connectionResult.connectionProfile.syncMode,
                lastSyncedAt: connectionResult.connectionProfile.lastSyncedAt,
              }
            : current,
        );
      }

      markDatabaseSyncStarted();

      try {
        const syncedAt = syncOptions?.sentAt ?? new Date().toISOString();
        const payload = await saveCampaignMutation.mutateAsync({
          campaign: {
            ...campaign,
            sourceType: campaign.sourceType ?? "manual",
          },
          recipients,
          sourceType: campaign.sourceType ?? "manual",
          savedListId: campaign.savedListId,
          sentAt: syncedAt,
          profileId,
        });

        markDatabaseSyncSucceeded(payload.syncedAt);
        updateActiveConnection((current) =>
          current
            ? {
                ...current,
                lastSyncedAt: payload.syncedAt,
              }
            : current,
        );
        await options?.onSavedDataChange?.();

        return {
          syncedAt: payload.syncedAt,
        };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Database sync failed.";
      markDatabaseSyncFailed(message);
      return null;
    }
  },
    [
      activeConnection,
      campaign,
      markDatabaseSyncFailed,
      markDatabaseSyncPending,
      markDatabaseSyncStarted,
      markDatabaseSyncSucceeded,
      options,
      connectDatabaseMutation,
      recipients,
      saveCampaignMutation,
      updateActiveConnection,
    ],
  );

  return {
    activeConnection,
    canSyncCurrentCampaign: Boolean(campaign && activeConnection),
    error:
      (saveCampaignMutation.error instanceof Error ? saveCampaignMutation.error.message : null) ??
      ui.lastDatabaseSyncError ??
      null,
    isSyncing: saveCampaignMutation.isPending || ui.isDatabaseSyncing,
    needsSync: ui.needsDatabaseSync,
    lastSyncedAt: activeConnection?.lastSyncedAt ?? ui.lastDatabaseSyncAt,
    syncCurrentCampaign,
  };
}
