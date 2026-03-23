import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  authProvider: text("auth_provider").notNull().default("google"),
  authSubject: text("auth_subject").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const connectionProfiles = pgTable(
  "connection_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    label: text("label").notNull(),
    displayHost: text("display_host").notNull(),
    displayDatabaseName: text("display_database_name").notNull(),
    displayProjectRef: text("display_project_ref"),
    lastSelectedTable: text("last_selected_table"),
    syncMode: text("sync_mode").notNull().default("auto"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "string" }),
  },
  (table) => ({
    userIndex: index("connection_profiles_user_idx").on(table.userId, table.updatedAt),
  }),
);

export const savedLists = pgTable(
  "saved_lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceFileLabel: text("source_file_label").notNull(),
    rowCount: integer("row_count").notNull(),
    validRowCount: integer("valid_row_count").notNull(),
    invalidRowCount: integer("invalid_row_count").notNull(),
    selectedEmailColumn: text("selected_email_column"),
    selectedRecipientColumn: text("selected_recipient_column"),
    schemaSnapshotJson: jsonb("schema_snapshot_json").notNull(),
    sourceConnectionProfileId: text("source_connection_profile_id").references(
      () => connectionProfiles.id,
      { onDelete: "set null" },
    ),
    destinationTableName: text("destination_table_name"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => ({
    userIndex: index("saved_lists_user_idx").on(table.userId, table.updatedAt),
  }),
);

export const savedListRows = pgTable(
  "saved_list_rows",
  {
    id: text("id").primaryKey(),
    savedListId: text("saved_list_id")
      .notNull()
      .references(() => savedLists.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    email: text("email"),
    recipient: text("recipient"),
    isValid: boolean("is_valid").notNull(),
    invalidReason: text("invalid_reason"),
    rawJson: jsonb("raw_json").notNull(),
    normalizedFieldsJson: jsonb("normalized_fields_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => ({
    listIndex: index("saved_list_rows_list_idx").on(table.savedListId, table.rowIndex),
  }),
);

export const campaignRuns = pgTable(
  "campaign_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    savedListId: text("saved_list_id").references(() => savedLists.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    globalSubject: text("global_subject").notNull(),
    globalBodyTemplate: text("global_body_template").notNull(),
    globalCcEmails: text("global_cc_emails").array(),
    sourceType: text("source_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  },
  (table) => ({
    userIndex: index("campaign_runs_user_idx").on(table.userId, table.createdAt),
  }),
);

export const campaignRunRecipients = pgTable(
  "campaign_run_recipients",
  {
    id: text("id").primaryKey(),
    campaignRunId: text("campaign_run_id")
      .notNull()
      .references(() => campaignRuns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    recipient: text("recipient"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    ccEmails: text("cc_emails").array(),
    fieldsJson: jsonb("fields_json").notNull(),
    sendStatus: text("send_status").notNull(),
    errorMessage: text("error_message"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => ({
    runIndex: index("campaign_run_recipients_run_idx").on(table.campaignRunId, table.createdAt),
  }),
);
