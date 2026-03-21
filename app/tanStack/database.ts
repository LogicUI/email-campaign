"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  connectDatabase,
  describeDatabaseTable,
  importDatabaseTablePreview,
  listDatabaseTables,
  saveDatabaseImport,
  testDatabaseConnection,
  updateDatabaseConnectionProfile,
} from "@/frontendApi";
import { queryKeys } from "@/tanStack/query-keys";
import type {
  DatabaseSaveImportPayload,
  DatabaseSessionConnection,
  DatabaseTableRef,
} from "@/types/database";

export function useDatabaseTablesQuery(
  connection: DatabaseSessionConnection | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.database.tables(connection),
    queryFn: () => listDatabaseTables(connection as DatabaseSessionConnection),
    enabled: enabled && Boolean(connection?.connectionString.trim()),
  });
}

export function useTestDatabaseConnectionMutation() {
  return useMutation({
    mutationFn: testDatabaseConnection,
  });
}

export function useConnectDatabaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: connectDatabase,
    onSuccess: (data, connection) => {
      queryClient.setQueryData(queryKeys.database.tables(connection), data.tables);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.summary(),
      });
    },
  });
}

export function useUpdateDatabaseConnectionProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      profileId: string;
      syncMode: DatabaseSessionConnection["syncMode"];
    }) => updateDatabaseConnectionProfile(params.profileId, params.syncMode),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.summary(),
      });
    },
  });
}

export function useDescribeDatabaseTableMutation(connection: DatabaseSessionConnection | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (table: DatabaseTableRef) =>
      describeDatabaseTable(connection as DatabaseSessionConnection, table),
    onSuccess: (data, table) => {
      queryClient.setQueryData(queryKeys.database.tableSchema(connection, table.displayName), data);
    },
  });
}

export function useImportDatabaseTablePreviewMutation(
  connection: DatabaseSessionConnection | null,
) {
  return useMutation({
    mutationFn: (table: DatabaseTableRef) =>
      importDatabaseTablePreview(connection as DatabaseSessionConnection, table),
  });
}

export function useSaveDatabaseImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DatabaseSaveImportPayload) => saveDatabaseImport(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.summary(),
      });
    },
  });
}
