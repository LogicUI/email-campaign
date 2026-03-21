"use client";

import { useCallback, useMemo, useState } from "react";

import { useDatabaseSessionStore } from "@/store/database-session-store";
import {
  useConnectDatabaseMutation,
  useDatabaseTablesQuery,
  useTestDatabaseConnectionMutation,
  useUpdateDatabaseConnectionProfileMutation,
} from "@/tanStack/database";
import type {
  DatabaseConnectionProfile,
  DatabaseSessionConnection,
  DatabaseSyncMode,
} from "@/types/database";

type SuccessState =
  | {
      kind: "test";
      message: string;
    }
  | {
      kind: "connect";
      message: string;
    }
  | null;

function buildConnectionFingerprint(connection: DatabaseSessionConnection) {
  return JSON.stringify([
    connection.provider,
    connection.label.trim(),
    connection.connectionString.trim(),
  ]);
}

/**
 * Drives the Database settings dialog state and server interactions.
 *
 * This hook centralizes connection testing, explicit connection activation,
 * saved-profile state, and table discovery so the dialog component stays mostly
 * presentational. Network lifecycle state is sourced from TanStack Query and
 * TanStack Mutation rather than hand-managed booleans.
 *
 * @param initialProfiles Saved connection profiles fetched from the server.
 * @param options.loadTables When false, skips table discovery queries for
 * contexts that only need session connect/disconnect controls.
 * @returns Dialog state plus actions for testing, connecting, and updating sync
 * preferences.
 */
export function useDatabaseSettings(
  initialProfiles?: DatabaseConnectionProfile[],
  options?: {
    loadTables?: boolean;
  },
) {
  const activeConnection = useDatabaseSessionStore((state) => state.activeConnection);
  const setActiveConnection = useDatabaseSessionStore((state) => state.setActiveConnection);
  const clearStoredActiveConnection = useDatabaseSessionStore((state) => state.clearActiveConnection);
  const testConnectionMutation = useTestDatabaseConnectionMutation();
  const connectConnectionMutation = useConnectDatabaseMutation();
  const updateSyncModeMutation = useUpdateDatabaseConnectionProfileMutation();
  const tablesQuery = useDatabaseTablesQuery(activeConnection, options?.loadTables ?? true);
  const [testedConnectionFingerprint, setTestedConnectionFingerprint] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState>(null);
  const profiles = initialProfiles ?? [];

  const persistConnection = useCallback(
    async (
      connection: DatabaseSessionConnection,
      options?: {
        silentSuccess?: boolean;
      },
    ) => {
      const data = await connectConnectionMutation.mutateAsync(connection);
      const nextConnection = {
        ...connection,
        profileId: data.connectionProfile.id,
        syncMode: data.connectionProfile.syncMode,
        lastSyncedAt: data.connectionProfile.lastSyncedAt,
      } satisfies DatabaseSessionConnection;

      setActiveConnection(nextConnection);

      if (!options?.silentSuccess) {
        setSuccessState({
          kind: "connect",
          message: "Database connected successfully.",
        });
      }

      return {
        connection: nextConnection,
        data,
      };
    },
    [connectConnectionMutation, setActiveConnection],
  );

  const clearActiveConnection = useCallback(() => {
    clearStoredActiveConnection();
    setSuccessState(null);
    setTestedConnectionFingerprint(null);
    testConnectionMutation.reset();
    connectConnectionMutation.reset();
    updateSyncModeMutation.reset();
  }, [
    clearStoredActiveConnection,
    connectConnectionMutation,
    testConnectionMutation,
    updateSyncModeMutation,
  ]);

  const invalidateConnectionTest = useCallback(() => {
    setSuccessState(null);
    setTestedConnectionFingerprint(null);
    testConnectionMutation.reset();
    connectConnectionMutation.reset();
  }, [connectConnectionMutation, testConnectionMutation]);

  const isConnectionReadyToConnect = useCallback(
    (connection: DatabaseSessionConnection) =>
      testedConnectionFingerprint === buildConnectionFingerprint(connection),
    [testedConnectionFingerprint],
  );

  const testConnection = useCallback(
    async (connection: DatabaseSessionConnection) => {
      testConnectionMutation.reset();
      connectConnectionMutation.reset();
      setSuccessState(null);

      const data = await testConnectionMutation.mutateAsync(connection);

      setTestedConnectionFingerprint(buildConnectionFingerprint(connection));
      setSuccessState({
        kind: "test",
        message:
          "Connection test passed. Click Connect to use this database in the current browser session.",
      });

      return data;
    },
    [connectConnectionMutation, testConnectionMutation],
  );

  const connectConnection = useCallback(
    async (connection: DatabaseSessionConnection) => {
      connectConnectionMutation.reset();
      setSuccessState(null);

      const result = await persistConnection(connection);

      return result.data;
    },
    [connectConnectionMutation, persistConnection],
  );

  const updateSyncMode = useCallback(
    async (profileId: string, syncMode: DatabaseSyncMode) => {
      let connectionProfile: DatabaseConnectionProfile;

      if (!activeConnection) {
        throw new Error("Connect a database before changing sync mode.");
      }

      if (!profileId) {
        const result = await persistConnection(
          {
            ...activeConnection,
            syncMode,
          },
          {
            silentSuccess: true,
          },
        );
        connectionProfile = result.data.connectionProfile;
      } else {
        try {
          connectionProfile = await updateSyncModeMutation.mutateAsync({
            profileId,
            syncMode,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.toLowerCase().includes("connection profile not found")
          ) {
            const result = await persistConnection(
              {
                ...activeConnection,
                syncMode,
              },
              {
                silentSuccess: true,
              },
            );
            connectionProfile = result.data.connectionProfile;
          } else {
            throw error;
          }
        }
      }

      setActiveConnection({
        ...activeConnection,
        profileId: connectionProfile.id,
        syncMode: connectionProfile.syncMode,
        lastSyncedAt: connectionProfile.lastSyncedAt,
      });

      return connectionProfile;
    },
    [activeConnection, persistConnection, setActiveConnection, updateSyncModeMutation],
  );

  const error = useMemo(() => {
    const activeError =
      connectConnectionMutation.error ??
      testConnectionMutation.error ??
      updateSyncModeMutation.error ??
      tablesQuery.error ??
      null;

    return activeError instanceof Error ? activeError.message : null;
  }, [
    connectConnectionMutation.error,
    tablesQuery.error,
    testConnectionMutation.error,
    updateSyncModeMutation.error,
  ]);

  return {
    activeConnection,
    clearActiveConnection,
    connectConnection,
    error,
    invalidateConnectionTest,
    isConnectingConnection: connectConnectionMutation.isPending,
    isConnectionReadyToConnect,
    isLoadingTables: tablesQuery.isPending || tablesQuery.isFetching,
    isTestingConnection: testConnectionMutation.isPending,
    profiles,
    successKind: successState?.kind ?? null,
    successMessage: successState?.message ?? null,
    tables: tablesQuery.data ?? [],
    testConnection,
    updateSyncMode,
  };
}
