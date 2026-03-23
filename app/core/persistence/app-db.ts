import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";

import * as schema from "@/core/persistence/schema";

declare global {
  // eslint-disable-next-line no-var
  var __emailAiAppDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __emailAiAppDbOverride: AppDatabase | undefined;
}

export type AppDatabase = PgDatabase<any, typeof schema>;

let cachedDb: AppDatabase | null | undefined;
let schemaEnsurePromise: Promise<void> | null = null;

const appSchemaStatements = [
  `create table if not exists app_users (
    id text primary key,
    email text not null,
    auth_provider text not null default 'google',
    auth_subject text not null unique,
    created_at timestamptz not null,
    updated_at timestamptz not null
  )`,
  `create table if not exists connection_profiles (
    id text primary key,
    user_id text not null references app_users(id) on delete cascade,
    provider text not null,
    label text not null,
    display_host text not null,
    display_database_name text not null,
    display_project_ref text,
    last_selected_table text,
    sync_mode text not null default 'auto',
    created_at timestamptz not null,
    updated_at timestamptz not null,
    last_used_at timestamptz not null,
    last_synced_at timestamptz
  )`,
  `create index if not exists connection_profiles_user_idx on connection_profiles (user_id, updated_at)`,
  `create table if not exists saved_lists (
    id text primary key,
    user_id text not null references app_users(id) on delete cascade,
    name text not null,
    source_file_label text not null,
    row_count integer not null,
    valid_row_count integer not null,
    invalid_row_count integer not null,
    selected_email_column text,
    selected_recipient_column text,
    schema_snapshot_json jsonb not null,
    source_connection_profile_id text references connection_profiles(id) on delete set null,
    destination_table_name text,
    created_at timestamptz not null,
    updated_at timestamptz not null
  )`,
  `create index if not exists saved_lists_user_idx on saved_lists (user_id, updated_at)`,
  `create table if not exists saved_list_rows (
    id text primary key,
    saved_list_id text not null references saved_lists(id) on delete cascade,
    row_index integer not null,
    email text,
    recipient text,
    is_valid boolean not null,
    invalid_reason text,
    raw_json jsonb not null,
    normalized_fields_json jsonb not null,
    created_at timestamptz not null
  )`,
  `create index if not exists saved_list_rows_list_idx on saved_list_rows (saved_list_id, row_index)`,
  `create table if not exists campaign_runs (
    id text primary key,
    user_id text not null references app_users(id) on delete cascade,
    saved_list_id text references saved_lists(id) on delete set null,
    name text not null,
    global_subject text not null,
    global_body_template text not null,
    source_type text not null,
    created_at timestamptz not null,
    sent_at timestamptz
  )`,
  `create index if not exists campaign_runs_user_idx on campaign_runs (user_id, created_at)`,
  `create table if not exists campaign_run_recipients (
    id text primary key,
    campaign_run_id text not null references campaign_runs(id) on delete cascade,
    email text not null,
    recipient text,
    subject text not null,
    body text not null,
    fields_json jsonb not null,
    send_status text not null,
    error_message text,
    provider_message_id text,
    sent_at timestamptz,
    created_at timestamptz not null
  )`,
  `create index if not exists campaign_run_recipients_run_idx on campaign_run_recipients (campaign_run_id, created_at)`,
];

export function setAppDatabaseForTests(db: AppDatabase | undefined) {
  globalThis.__emailAiAppDbOverride = db;
  cachedDb = undefined;
  schemaEnsurePromise = null;
}

/**
 * Lazily creates and caches the app-owned Drizzle database client.
 *
 * This exists so server code can share a single small Postgres pool across requests
 * instead of instantiating a new client every time a repository is called. When
 * `APP_DATABASE_URL` is missing we return `null`, allowing the caller to decide
 * whether the feature should degrade gracefully or throw.
 *
 * @returns Shared app database client, or `null` when persistence is not configured.
 */
function getAppDatabase(): AppDatabase | null {
  if (process.env.NODE_ENV === "test" && globalThis.__emailAiAppDbOverride) {
    return globalThis.__emailAiAppDbOverride;
  }

  if (cachedDb !== undefined) {
    return cachedDb;
  }

  const connectionString = process.env.APP_DATABASE_URL?.trim();

  if (!connectionString) {
    cachedDb = null;
    return cachedDb;
  }

  const pool =
    globalThis.__emailAiAppDbPool ??
    new Pool({
      connectionString,
      max: 5,
    });

  globalThis.__emailAiAppDbPool = pool;
  cachedDb = drizzle(pool, {
    schema,
    casing: "snake_case",
  });

  return cachedDb;
}

/**
 * Returns the app database client and fails loudly when persistence is unavailable.
 *
 * Use this in code paths where persistence is mandatory rather than optional.
 *
 * @returns Configured app database client.
 * @throws Error when `APP_DATABASE_URL` is not configured.
 */
function requireAppDatabase() {
  const db = getAppDatabase();

  if (!db) {
    throw new Error("APP_DATABASE_URL is not configured.");
  }

  return db;
}

/**
 * Ensures the app database client is ready for repository use.
 *
 * Repository functions call this instead of `getAppDatabase()` directly so the
 * bootstrap DDL runs once before the first query. That removes the "fresh DB with
 * no tables" failure mode during local development and simple deployments.
 *
 * @returns Ready-to-query app database client, or `null` if persistence is disabled.
 */
export async function getReadyAppDatabase() {
  const db = getAppDatabase();

  if (!db) {
    return null;
  }

  if (process.env.NODE_ENV === "test" && globalThis.__emailAiAppDbOverride) {
    return db;
  }

  await ensureAppDatabaseSchema();
  return db;
}

/**
 * Executes the lightweight bootstrap schema for the app-owned persistence tables.
 *
 * This is intentionally idempotent and memoized. It exists as a safety net for the
 * current app architecture so local setups can come up without a separate migration
 * step before the first request touches the database.
 *
 * @returns Promise that resolves once the schema has been created or confirmed.
 */
async function ensureAppDatabaseSchema() {
  const db = getAppDatabase();

  if (!db) {
    return;
  }

  if (!schemaEnsurePromise) {
    schemaEnsurePromise = (async () => {
      for (const statement of appSchemaStatements) {
        await db.execute(sql.raw(statement));
      }
    })();
  }

  await schemaEnsurePromise;
}
