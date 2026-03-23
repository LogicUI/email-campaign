import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pg-proxy";
import { newDb, replaceQueryArgs$, type IBackup } from "pg-mem";

import * as schema from "@/core/persistence/schema";

const testQuerySchema = {
  ...schema,
  appUsersTable: schema.appUsers,
  campaignHistoryTable: schema.campaignRuns,
  campaignRecipientsTable: schema.campaignRunRecipients,
  databaseConnectionProfilesTable: schema.connectionProfiles,
  savedListsTable: schema.savedLists,
  savedListRowsTable: schema.savedListRows,
};

type AppTestDatabase = PgDatabase<any, typeof schema>;
type TestQueryDatabase = PgDatabase<any, typeof testQuerySchema>;
type TestDatabaseState = {
  appDb: AppTestDatabase;
  backup: IBackup;
  testDb: TestQueryDatabase;
};

function createPgMemClient(memoryDb: ReturnType<typeof newDb>) {
  return async (query: string, params: unknown[]) => {
    const result = memoryDb.public.query(replaceQueryArgs$(query, params));

    return {
      rows: result.rows.map((row) => result.fields.map((field) => row[field.name])),
    };
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __emailAiTestDbState: TestDatabaseState | undefined;
}

export type TestDatabase = TestQueryDatabase;

const testSchemaStatements = [
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
    global_cc_emails text[],
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
    cc_emails text[],
    fields_json jsonb not null,
    send_status text not null,
    error_message text,
    provider_message_id text,
    sent_at timestamptz,
    created_at timestamptz not null
  )`,
  `create index if not exists campaign_run_recipients_run_idx on campaign_run_recipients (campaign_run_id, created_at)`,
];

/**
 * Initializes the shared in-memory Postgres instance used by the test suite.
 *
 * The schema is created once and snapshotted so each test can restore the empty
 * state instantly.
 */
export async function initializeTestDatabase(): Promise<void> {
  if (globalThis.__emailAiTestDbState) {
    return;
  }

  const memoryDb = newDb();
  const client = createPgMemClient(memoryDb);
  const appDb = drizzle(client, {
    schema,
    casing: "snake_case",
  });
  const testDb = drizzle(client, {
    schema: testQuerySchema,
    casing: "snake_case",
  });

  for (const statement of testSchemaStatements) {
    await appDb.execute(sql.raw(statement));
  }

  globalThis.__emailAiTestDbState = {
    appDb,
    backup: memoryDb.backup(),
    testDb,
  };
}

/**
 * Returns the app-facing database bound to the shared in-memory backend.
 */
export function getAppTestDatabase(): AppTestDatabase {
  const state = globalThis.__emailAiTestDbState;

  if (!state) {
    throw new Error("Test database has not been initialized. Call initializeTestDatabase() first.");
  }

  return state.appDb;
}

/**
 * Returns the test-facing database with compatibility aliases used in assertions.
 */
export function getTestDatabase(): TestQueryDatabase {
  const state = globalThis.__emailAiTestDbState;

  if (!state) {
    throw new Error("Test database has not been initialized. Call initializeTestDatabase() first.");
  }

  return state.testDb;
}

/**
 * Restores the in-memory database to its empty post-schema snapshot.
 */
export function resetTestDatabase(): void {
  const state = globalThis.__emailAiTestDbState;

  if (!state) {
    throw new Error("Test database has not been initialized. Call initializeTestDatabase() first.");
  }

  state.backup.restore();
}

/**
 * Clears the shared in-memory database state.
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (globalThis.__emailAiTestDbState) {
    globalThis.__emailAiTestDbState = undefined;
  }
}
