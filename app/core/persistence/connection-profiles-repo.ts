import { and, desc, eq } from "drizzle-orm";

import { createId } from "@/core/utils/ids";
import { getReadyAppDatabase } from "@/core/persistence/app-db";
import { connectionProfiles } from "@/core/persistence/schema";
import type {
  DatabaseConnectionProfile,
  DatabaseSyncMode,
} from "@/types/database";

/**
 * Converts a raw Drizzle row into the UI-facing connection profile shape.
 *
 * This keeps repository output consistent and centralizes all `null` to `undefined`
 * normalization so the rest of the app can work with a cleaner TypeScript model.
 *
 * @param row Raw `connection_profiles` row from the app database.
 * @returns Normalized connection profile for API and UI consumers.
 */
function mapConnectionProfile(
  row: typeof connectionProfiles.$inferSelect,
): DatabaseConnectionProfile {
  return {
    id: row.id,
    provider: row.provider as DatabaseConnectionProfile["provider"],
    label: row.label,
    displayHost: row.displayHost,
    displayDatabaseName: row.displayDatabaseName,
    displayProjectRef: row.displayProjectRef ?? undefined,
    lastSelectedTable: row.lastSelectedTable ?? undefined,
    syncMode: row.syncMode as DatabaseSyncMode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
    lastSyncedAt: row.lastSyncedAt ?? undefined,
  };
}

/**
 * Lists all saved database connection profiles for a user.
 *
 * The settings dialog uses this to show reconnectable destinations and their sync
 * preferences. Results are ordered by most recently used/updated so the likely
 * active profile appears first.
 *
 * @param userId Stable app-owned user identifier.
 * @returns Connection profiles for the current user, newest first.
 */
export async function listConnectionProfilesForUser(userId: string) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return [] as DatabaseConnectionProfile[];
  }

  const rows = await db
    .select()
    .from(connectionProfiles)
    .where(eq(connectionProfiles.userId, userId))
    .orderBy(desc(connectionProfiles.lastUsedAt), desc(connectionProfiles.updatedAt));

  return rows.map(mapConnectionProfile);
}

/**
 * Creates or updates a non-secret connection profile for the current user.
 *
 * The app deliberately stores only display metadata for external databases, not raw
 * credentials. This repository function powers the explicit connect flow by either
 * refreshing an existing profile with the same user/provider/label tuple or creating
 * a new one.
 *
 * @param params.userId Stable app-owned user identifier.
 * @param params.provider External provider type, currently Supabase/Postgres.
 * @param params.label User-facing name for the saved profile.
 * @param params.displayHost Safe host name derived from the DSN.
 * @param params.displayDatabaseName Safe database name derived from the DSN.
 * @param params.displayProjectRef Optional Supabase project reference.
 * @param params.lastSelectedTable Optional last-used table hint for UX convenience.
 * @param params.syncMode Preferred send-history sync mode for this profile.
 * @returns The persisted or synthesized profile record.
 */
export async function upsertConnectionProfile(params: {
  userId: string;
  provider: DatabaseConnectionProfile["provider"];
  label: string;
  displayHost: string;
  displayDatabaseName: string;
  displayProjectRef?: string;
  lastSelectedTable?: string;
  syncMode?: DatabaseSyncMode;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return {
      id: createId("dbprofile"),
      provider: params.provider,
      label: params.label,
      displayHost: params.displayHost,
      displayDatabaseName: params.displayDatabaseName,
      displayProjectRef: params.displayProjectRef,
      lastSelectedTable: params.lastSelectedTable,
      syncMode: params.syncMode ?? "auto",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    } satisfies DatabaseConnectionProfile;
  }

  const existing = await db
    .select()
    .from(connectionProfiles)
    .where(
      and(
        eq(connectionProfiles.userId, params.userId),
        eq(connectionProfiles.provider, params.provider),
        eq(connectionProfiles.label, params.label),
      ),
    )
    .limit(1);

  const now = new Date().toISOString();

  if (existing[0]) {
    await db
      .update(connectionProfiles)
      .set({
        displayHost: params.displayHost,
        displayDatabaseName: params.displayDatabaseName,
        displayProjectRef: params.displayProjectRef ?? null,
        lastSelectedTable: params.lastSelectedTable ?? null,
        syncMode: params.syncMode ?? existing[0].syncMode,
        updatedAt: now,
        lastUsedAt: now,
      })
      .where(eq(connectionProfiles.id, existing[0].id));

    return mapConnectionProfile({
      ...existing[0],
      displayHost: params.displayHost,
      displayDatabaseName: params.displayDatabaseName,
      displayProjectRef: params.displayProjectRef ?? null,
      lastSelectedTable: params.lastSelectedTable ?? null,
      syncMode: params.syncMode ?? existing[0].syncMode,
      updatedAt: now,
      lastUsedAt: now,
    });
  }

  const id = createId("dbprofile");

  await db.insert(connectionProfiles).values({
    id,
    userId: params.userId,
    provider: params.provider,
    label: params.label,
    displayHost: params.displayHost,
    displayDatabaseName: params.displayDatabaseName,
    displayProjectRef: params.displayProjectRef ?? null,
    lastSelectedTable: params.lastSelectedTable ?? null,
    syncMode: params.syncMode ?? "auto",
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    lastSyncedAt: null,
  });

  return {
    id,
    provider: params.provider,
    label: params.label,
    displayHost: params.displayHost,
    displayDatabaseName: params.displayDatabaseName,
    displayProjectRef: params.displayProjectRef,
    lastSelectedTable: params.lastSelectedTable,
    syncMode: params.syncMode ?? "auto",
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    lastSyncedAt: undefined,
  } satisfies DatabaseConnectionProfile;
}

/**
 * Updates the send-history sync mode for one saved connection profile.
 *
 * This exists so the Database settings dialog can toggle between automatic sync
 * after send and manual sync triggered by the user.
 *
 * @param params.profileId Connection profile being edited.
 * @param params.userId Stable app-owned user identifier used for ownership checks.
 * @param params.syncMode Desired sync behavior for this profile.
 * @returns The updated profile, or `null` if no owned profile was found.
 */
export async function updateConnectionProfileSyncMode(params: {
  profileId: string;
  userId: string;
  syncMode: DatabaseSyncMode;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return null;
  }

  const now = new Date().toISOString();

  await db
    .update(connectionProfiles)
    .set({
      syncMode: params.syncMode,
      updatedAt: now,
    })
    .where(
      and(
        eq(connectionProfiles.id, params.profileId),
        eq(connectionProfiles.userId, params.userId),
      ),
    );

  const row = await db
    .select()
    .from(connectionProfiles)
    .where(
      and(
        eq(connectionProfiles.id, params.profileId),
        eq(connectionProfiles.userId, params.userId),
      ),
    )
    .limit(1);

  return row[0] ? mapConnectionProfile(row[0]) : null;
}

/**
 * Records the last successful campaign-history sync timestamp for a profile.
 *
 * The UI surfaces this in Database settings so the user can tell whether the current
 * browser workspace has already been pushed to the database.
 *
 * @param params.profileId Connection profile associated with the sync.
 * @param params.userId Stable app-owned user identifier used for ownership checks.
 * @param params.syncedAt ISO timestamp of the successful sync operation.
 * @returns The updated profile, or `null` if no owned profile was found.
 */
export async function markConnectionProfileSynced(params: {
  profileId: string;
  userId: string;
  syncedAt: string;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return null;
  }

  await db
    .update(connectionProfiles)
    .set({
      lastSyncedAt: params.syncedAt,
      updatedAt: params.syncedAt,
    })
    .where(
      and(
        eq(connectionProfiles.id, params.profileId),
        eq(connectionProfiles.userId, params.userId),
      ),
    );

  const row = await db
    .select()
    .from(connectionProfiles)
    .where(
      and(
        eq(connectionProfiles.id, params.profileId),
        eq(connectionProfiles.userId, params.userId),
      ),
    )
    .limit(1);

  return row[0] ? mapConnectionProfile(row[0]) : null;
}
