"use client";

import type { DatabaseSessionConnection } from "@/types/database";

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function getConnectionQueryFingerprint(
  connection?: Pick<DatabaseSessionConnection, "provider" | "connectionString"> | null,
) {
  if (!connection?.connectionString.trim()) {
    return "disconnected";
  }

  return `${connection.provider}:${hashString(connection.connectionString.trim())}`;
}

export const queryKeys = {
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
    savedList: (savedListId: string) => ["dashboard", "saved-list", savedListId] as const,
    campaign: (campaignId: string) => ["dashboard", "campaign", campaignId] as const,
  },
  database: {
    tables: (connection?: Pick<DatabaseSessionConnection, "provider" | "connectionString"> | null) =>
      ["database", "tables", getConnectionQueryFingerprint(connection)] as const,
    tableSchema: (
      connection: Pick<DatabaseSessionConnection, "provider" | "connectionString"> | null,
      tableDisplayName: string,
    ) =>
      [
        "database",
        "table-schema",
        getConnectionQueryFingerprint(connection),
        tableDisplayName,
      ] as const,
  },
};
