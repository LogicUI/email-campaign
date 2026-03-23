import type {
  CampaignHistoryDetail,
  CampaignHistorySummary,
  DatabaseConnectionProfile,
  SavedListDetail,
} from "@/types/database";
import type { CampaignRecipient } from "@/types/campaign";
import type { SendPayloadRecipient } from "@/types/api";

/**
 * Creates a test user ID.
 */
function createTestUserId(): string {
  return `user_${crypto.randomUUID()}`;
}

/**
 * Creates a test user object with default values.
 *
 * @param overrides - Partial user object to override defaults
 * @returns Test user object
 */
export function createTestUser(overrides: Partial<{ id: string; email: string; authSubject: string }> = {}) {
  const id = overrides.id || createTestUserId();
  const email = overrides.email || "test@example.com";
  const authSubject = overrides.authSubject || `google_subject_${crypto.randomUUID()}`;

  return {
    id,
    email,
    authProvider: "google" as const,
    authSubject,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a test campaign ID.
 */
export function createTestCampaignId(): string {
  return `campaign_${crypto.randomUUID()}`;
}

/**
 * Creates a test campaign summary with default values.
 *
 * @param overrides - Partial campaign object to override defaults
 * @returns Test campaign summary object
 */
function createTestCampaign(overrides: Partial<CampaignHistorySummary> = {}): CampaignHistorySummary {
  const id = overrides.id || createTestCampaignId();
  const now = new Date().toISOString();

  return {
    id,
    name: overrides.name || "Test Campaign",
    sourceType: overrides.sourceType || "manual",
    savedListId: overrides.savedListId,
    sentCount: overrides.sentCount ?? 0,
    failedCount: overrides.failedCount ?? 0,
    createdAt: overrides.createdAt || now,
    sentAt: overrides.sentAt,
  };
}

/**
 * Creates test campaign recipients.
 *
 * @param count - Number of recipients to create
 * @param overrides - Partial recipient object to override defaults for all recipients
 * @returns Array of test campaign recipient objects
 */
export function createTestRecipients(
  count: number = 3,
  overrides: Partial<CampaignRecipient> = {}
): CampaignRecipient[] {
  return Array.from({ length: count }, (_, i) => ({
    id: overrides.id || `recipient_${crypto.randomUUID()}`,
    rowIndex: overrides.rowIndex ?? i,
    source: overrides.source || "manual",
    email: overrides.email || `recipient${i + 1}@example.com`,
    ccEmails: overrides.ccEmails,
    recipient: overrides.recipient || `Recipient ${i + 1}`,
    sourceFileName: overrides.sourceFileName,
    sourceSheetName: overrides.sourceSheetName,
    subject: overrides.subject || `Test Subject ${i + 1}`,
    body: overrides.body || `Test body ${i + 1}`,
    checked: overrides.checked ?? true,
    sent: overrides.sent ?? false,
    fields: overrides.fields || { name: `Test Name ${i + 1}` },
    status: overrides.status || "draft",
    bodySource: overrides.bodySource || "manual",
    lastGeneratedBody: overrides.lastGeneratedBody,
    lastGenerationAt: overrides.lastGenerationAt,
    manualEditsSinceGenerate: overrides.manualEditsSinceGenerate ?? false,
    isRegenerating: overrides.isRegenerating ?? false,
    regenerationPhase: overrides.regenerationPhase || "idle",
    streamOriginalBody: overrides.streamOriginalBody,
    lastGenerationReasoning: overrides.lastGenerationReasoning,
    isSending: overrides.isSending ?? false,
    errorMessage: overrides.errorMessage,
    lastProviderMessageId: overrides.lastProviderMessageId,
    lastSendAttemptAt: overrides.lastSendAttemptAt,
  }));
}

/**
 * Creates test send payload recipients for bulk send API.
 *
 * @param count - Number of recipients to create
 * @param overrides - Partial recipient object to override defaults for all recipients
 * @returns Array of send payload recipient objects
 */
export function createTestSendRecipients(
  count: number = 3,
  overrides: Partial<SendPayloadRecipient> = {}
): SendPayloadRecipient[] {
  return Array.from({ length: count }, (_, i) => ({
    id: overrides.id || `recipient_${crypto.randomUUID()}`,
    email: overrides.email || `recipient${i + 1}@example.com`,
    subject: overrides.subject || `Test Subject ${i + 1}`,
    body: overrides.body || `Test body ${i + 1}`,
  }));
}

/**
 * Creates a test saved list ID.
 */
function createTestSavedListId(): string {
  return `savedlist_${crypto.randomUUID()}`;
}

/**
 * Creates a test saved list with default values.
 *
 * @param overrides - Partial saved list object to override defaults
 * @returns Test saved list detail object
 */
function createTestSavedList(overrides: Partial<SavedListDetail> = {}): SavedListDetail {
  const id = overrides.id || createTestSavedListId();
  const now = new Date().toISOString();
  const rowCount = overrides.rowCount ?? 3;

  return {
    id,
    name: overrides.name || "Test List",
    sourceFileLabel: overrides.sourceFileLabel || "test.xlsx",
    rowCount,
    validRowCount: overrides.validRowCount ?? rowCount,
    invalidRowCount: overrides.invalidRowCount ?? 0,
    selectedEmailColumn: overrides.selectedEmailColumn || "email",
    selectedRecipientColumn: overrides.selectedRecipientColumn || "name",
    destinationTableName: overrides.destinationTableName,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    schemaSnapshot: overrides.schemaSnapshot || {
      headers: ["email", "name", "company"],
    },
    rows: overrides.rows || createTestSavedListRows(rowCount),
  };
}

/**
 * Creates test saved list rows.
 *
 * @param count - Number of rows to create
 * @returns Array of saved list row records
 */
function createTestSavedListRows(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    rowIndex: i,
    email: `recipient${i + 1}@example.com`,
    recipient: `Recipient ${i + 1}`,
    isValid: true,
    invalidReason: undefined,
    raw: {
      email: `recipient${i + 1}@example.com`,
      name: `Test Name ${i + 1}`,
      company: `Company ${i + 1}`,
    },
    normalizedFields: {
      email: `recipient${i + 1}@example.com`,
      name: `Test Name ${i + 1}`,
      company: `Company ${i + 1}`,
    },
  }));
}

/**
 * Creates a test database connection profile ID.
 */
function createTestConnectionProfileId(): string {
  return `dbprofile_${crypto.randomUUID()}`;
}

/**
 * Creates a test database connection profile with default values.
 *
 * @param overrides - Partial connection profile object to override defaults
 * @returns Test database connection profile object
 */
export function createTestConnectionProfile(overrides: Partial<DatabaseConnectionProfile> = {}): DatabaseConnectionProfile {
  const id = overrides.id || createTestConnectionProfileId();
  const now = new Date().toISOString();

  return {
    id,
    provider: overrides.provider || "supabase",
    label: overrides.label || "Test Database",
    displayHost: overrides.displayHost || "db.supabase.co",
    displayDatabaseName: overrides.displayDatabaseName || "postgres",
    displayProjectRef: overrides.displayProjectRef || "testproj",
    lastSelectedTable: overrides.lastSelectedTable,
    syncMode: overrides.syncMode || "auto",
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    lastUsedAt: overrides.lastUsedAt || now,
    lastSyncedAt: overrides.lastSyncedAt,
  };
}

/**
 * Creates a test campaign history detail with recipients.
 *
 * @param recipientCount - Number of recipients to include
 * @param overrides - Partial campaign object to override defaults
 * @returns Test campaign history detail object
 */
export function createTestCampaignDetail(
  recipientCount: number = 3,
  overrides: Partial<CampaignHistoryDetail> = {}
): CampaignHistoryDetail {
  const campaign = createTestCampaign(overrides);

  return {
    ...campaign,
    globalSubject: overrides.globalSubject || "Test Global Subject",
    globalBodyTemplate: overrides.globalBodyTemplate || "Test global body with {{name}} placeholder",
    recipients: overrides.recipients || createTestRecipients(recipientCount),
  };
}
