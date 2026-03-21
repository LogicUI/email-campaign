import { z } from "zod";

import { primitiveFieldValueSchema } from "@/zodSchemas/shared";

const requiredString = (message: string) => z.string().trim().min(1, message);

export const databaseProviderSchema = z.enum(["supabase", "postgres"]);

export const databaseSessionConnectionSchema = z.object({
  provider: databaseProviderSchema,
  connectionString: requiredString("Connection string is required."),
  label: requiredString("Connection label is required."),
  profileId: z.string().trim().optional(),
  syncMode: z.enum(["auto", "manual"]).default("auto"),
  lastSyncedAt: z.string().trim().optional(),
});

export const databaseTableRefSchema = z.object({
  schema: requiredString("Schema is required."),
  name: requiredString("Table name is required."),
  displayName: requiredString("Display name is required."),
});

export const inferredDatabaseColumnSchema = z.object({
  sourceHeader: requiredString("Source header is required."),
  suggestedName: requiredString("Column name is required."),
  suggestedType: requiredString("Column type is required."),
  nullable: z.boolean(),
});

export const databaseImportColumnMappingSchema = z.object({
  sourceColumn: requiredString("Source column is required."),
  destinationColumn: z.string().trim().optional(),
});

export const importPreviewRowSchema = z.object({
  tempId: requiredString("Temporary row id is required."),
  rowIndex: z.number().int(),
  email: z.string().trim().optional(),
  recipient: z.string().trim().optional(),
  sourceFileName: requiredString("Source file name is required."),
  sourceSheetName: z.string().trim().optional(),
  isValid: z.boolean(),
  invalidReason: z.string().trim().optional(),
  fields: z.record(z.string(), primitiveFieldValueSchema),
  raw: z.record(z.string(), z.unknown()),
});

export const importPreviewSchema = z.object({
  fileName: z.string().trim().optional(),
  sheetName: z.string().trim().optional(),
  sourceFiles: z.array(
    z.object({
      fileName: requiredString("Source file name is required."),
      sheetName: z.string().trim().optional(),
    }),
  ),
  sourceRows: z.array(
    z.object({
      raw: z.record(z.string(), z.unknown()),
      sourceFileName: requiredString("Source file name is required."),
      sourceSheetName: z.string().trim().optional(),
      originalRowIndex: z.number().int(),
    }),
  ),
  headers: z.array(z.string()),
  rows: z.array(importPreviewRowSchema),
  validCount: z.number().int(),
  invalidCount: z.number().int(),
  candidateEmailColumns: z.array(z.string()),
  candidateRecipientColumns: z.array(z.string()),
  selectedEmailColumn: z.string().trim().optional(),
  selectedRecipientColumn: z.string().trim().optional(),
});

export const testDatabaseConnectionRequestSchema = z.object({
  connection: databaseSessionConnectionSchema,
});

export const updateConnectionProfileRequestSchema = z.object({
  syncMode: z.enum(["auto", "manual"]),
});

export const listDatabaseTablesRequestSchema = z.object({
  connection: databaseSessionConnectionSchema,
});

export const describeDatabaseTableRequestSchema = z.object({
  connection: databaseSessionConnectionSchema,
  table: databaseTableRefSchema,
});

export const createDatabaseTableRequestSchema = z.object({
  connection: databaseSessionConnectionSchema,
  schemaName: requiredString("Schema name is required."),
  tableName: requiredString("Table name is required."),
  columns: z.array(inferredDatabaseColumnSchema).min(1, "At least one column is required."),
});

export const saveImportToDatabaseRequestSchema = z.object({
  connection: databaseSessionConnectionSchema.optional(),
  saveName: requiredString("Saved list name is required."),
  preview: importPreviewSchema,
  mode: z.enum(["existing_table", "new_table", "app_only"]),
  existingTable: databaseTableRefSchema.optional(),
  mappings: z.array(databaseImportColumnMappingSchema).optional(),
  newTable: z
    .object({
      schemaName: requiredString("Schema name is required."),
      tableName: requiredString("Table name is required."),
      columns: z.array(inferredDatabaseColumnSchema).min(1),
    })
    .optional(),
});

export const saveCampaignHistoryRequestSchema = z.object({
  campaign: z.object({
    id: requiredString("Campaign id is required."),
    name: requiredString("Campaign name is required."),
    globalSubject: z.string(),
    globalBodyTemplate: z.string(),
    createdAt: requiredString("Campaign creation time is required."),
    importedFileName: requiredString("Imported file name is required."),
    importedSheetName: z.string().trim().optional(),
    detectedEmailColumn: z.string().trim().optional(),
    detectedRecipientColumn: z.string().trim().optional(),
    totalRows: z.number().int(),
    validRows: z.number().int(),
    invalidRows: z.number().int(),
    sourceType: z.enum(["uploaded_list", "reused_history", "manual"]).optional(),
    savedListId: z.string().trim().optional(),
  }),
  recipients: z.array(
    z.object({
      id: requiredString("Recipient id is required."),
      rowIndex: z.number().int(),
      source: z.enum(["imported", "manual"]),
      email: z.string().trim(),
      recipient: z.string().trim().optional(),
      sourceFileName: z.string().trim().optional(),
      sourceSheetName: z.string().trim().optional(),
      subject: z.string(),
      body: z.string(),
      checked: z.boolean(),
      sent: z.boolean(),
      status: z.enum(["draft", "ready", "queued", "sending", "sent", "failed", "skipped"]),
      fields: z.record(z.string(), primitiveFieldValueSchema),
      bodySource: z.enum(["global-template", "ai-generated", "manual"]),
      lastGeneratedBody: z.string().optional(),
      lastGenerationAt: z.string().optional(),
      manualEditsSinceGenerate: z.boolean(),
      isRegenerating: z.boolean(),
      regenerationPhase: z.enum(["idle", "streaming", "finalizing"]),
      streamOriginalBody: z.string().optional(),
      lastGenerationReasoning: z.string().optional(),
      isSending: z.boolean(),
      lastSendAttemptAt: z.string().optional(),
      lastProviderMessageId: z.string().optional(),
      errorMessage: z.string().optional(),
    }),
  ),
  sourceType: z.enum(["uploaded_list", "reused_history", "manual"]).default("manual"),
  savedListId: z.string().trim().optional(),
  sentAt: z.string().trim().optional(),
  profileId: z.string().trim().optional(),
});
