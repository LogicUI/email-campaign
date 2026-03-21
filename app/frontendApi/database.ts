"use client";

import { requestApi } from "@/frontendApi/client";
import type {
  DatabaseConnectResponseData,
  DatabaseConnectionProfile,
  DatabaseConnectionTestResponseData,
  DatabaseDescribeTableResponseData,
  DatabaseSaveImportPayload,
  DatabaseSaveImportResponseData,
  DatabaseSessionConnection,
  DatabaseTableRef,
} from "@/types/database";

export function listDatabaseTables(connection: DatabaseSessionConnection) {
  return requestApi<{ tables: DatabaseTableRef[] }>({
    method: "POST",
    url: "/api/database/tables",
    data: {
      connection,
    },
  }).then((data) => data.tables);
}

export function testDatabaseConnection(connection: DatabaseSessionConnection) {
  return requestApi<DatabaseConnectionTestResponseData>({
    method: "POST",
    url: "/api/database/connection/test",
    data: {
      connection,
    },
  });
}

export function connectDatabase(connection: DatabaseSessionConnection) {
  return requestApi<DatabaseConnectResponseData>({
    method: "POST",
    url: "/api/database/connection/connect",
    data: {
      connection,
    },
  });
}

export function updateDatabaseConnectionProfile(
  profileId: string,
  syncMode: DatabaseSessionConnection["syncMode"],
) {
  return requestApi<{ connectionProfile: DatabaseConnectionProfile }>({
    method: "PATCH",
    url: `/api/database/connection/profiles/${profileId}`,
    data: {
      syncMode,
    },
  }).then((data) => data.connectionProfile);
}

export function describeDatabaseTable(
  connection: DatabaseSessionConnection,
  table: DatabaseTableRef,
) {
  return requestApi<DatabaseDescribeTableResponseData>({
    method: "POST",
    url: "/api/database/tables/describe",
    data: {
      connection,
      table,
    },
  });
}

export function saveDatabaseImport(payload: DatabaseSaveImportPayload) {
  return requestApi<DatabaseSaveImportResponseData>({
    method: "POST",
    url: "/api/database/imports/save",
    data: payload,
  });
}
