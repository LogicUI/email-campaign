import type { BulkSendRequest, RegenerateRequest, SendPayloadRecipient } from "@/types/api";
import type { GlobalTemplateRegenerateRequest } from "@/types/api";

/**
 * Creates a mock Request object for API route testing.
 *
 * @param url - The URL for the request
 * @param init - Optional request initialization options
 * @returns Mock Request object
 */
function createMockRequest(url: string, init?: RequestInit): Request {
  return new Request(url, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });
}

/**
 * Creates a mock bulk send request payload for /api/send/bulk endpoint.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock bulk send request payload
 */
export function createBulkSendRequest(overrides: Partial<BulkSendRequest> = {}): BulkSendRequest {
  return {
    campaignId: overrides.campaignId || `campaign_${crypto.randomUUID()}`,
    sendJobId: overrides.sendJobId || `sendjob_${crypto.randomUUID()}`,
    recipients: overrides.recipients || [
      {
        id: `recipient_${crypto.randomUUID()}`,
        email: "recipient@example.com",
        subject: "Hello",
        body: "Body",
      },
    ],
  };
}

/**
 * Creates a mock regenerate request payload for /api/ai/regenerate endpoint.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock regenerate request payload
 */
export function createRegenerateRequest(overrides: Partial<RegenerateRequest> = {}): RegenerateRequest {
  return {
    recipientId: overrides.recipientId || `recipient_${crypto.randomUUID()}`,
    globalSubject: overrides.globalSubject || "Test Subject",
    globalBodyTemplate: overrides.globalBodyTemplate || "Test Body with {{name}}",
    currentBody: overrides.currentBody || "Current Body",
    provider: overrides.provider || "anthropic",
    apiKey: overrides.apiKey || "sk-ant-test",
    model: overrides.model,
    recipient: overrides.recipient || {
      email: "recipient@example.com",
      fields: { name: "Test" },
    },
    mode: overrides.mode || "refresh",
    prompt: overrides.prompt,
  };
}

/**
 * Creates a mock global template regenerate request payload for /api/ai/regenerate-global-template endpoint.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock global template regenerate request payload
 */
export function createGlobalTemplateRegenerateRequest(
  overrides: Partial<GlobalTemplateRegenerateRequest> = {}
): GlobalTemplateRegenerateRequest {
  return {
    globalSubject: overrides.globalSubject || "Test Global Subject",
    globalBodyTemplate: overrides.globalBodyTemplate || "Test global body with {{name}} placeholder",
    provider: overrides.provider || "anthropic",
    apiKey: overrides.apiKey || "sk-ant-test",
    model: overrides.model,
    availablePlaceholders: overrides.availablePlaceholders || ["name", "company"],
    detectedRecipientPlaceholder: overrides.detectedRecipientPlaceholder,
    mode: overrides.mode || "refresh",
    prompt: overrides.prompt,
  };
}

/**
 * Creates a mock test email request payload for /api/send/test endpoint.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock test email request payload
 */
export function createTestEmailRequest(
  overrides: {
    toEmail?: string;
    to?: string;
    subject?: string;
    body?: string;
  } = {}
) {
  return {
    to: overrides.to || overrides.toEmail || "test@example.com",
    subject: overrides.subject || "Test Subject",
    body: overrides.body || "Test Body",
  };
}

/**
 * Creates a mock database connection request payload for database endpoints.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock database connection request payload
 */
function createDatabaseConnectRequest(
  overrides: {
    provider?: "supabase" | "postgres";
    label?: string;
    connectionString?: string;
    syncMode?: "auto" | "manual";
  } = {}
) {
  return {
    connection: {
      provider: overrides.provider || "supabase",
      label: overrides.label || "Test Database",
      connectionString:
        overrides.connectionString ||
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      syncMode: overrides.syncMode || "auto",
    },
  };
}

/**
 * Creates a mock Google Sheets import request payload.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock Google Sheets import request payload
 */
function createGoogleSheetsImportRequest(
  overrides: {
    spreadsheetId?: string;
    sheetName?: string;
    accessToken?: string;
  } = {}
) {
  return {
    spreadsheetId: overrides.spreadsheetId || "sheet123",
    sheetName: overrides.sheetName || "Sheet1",
    accessToken: overrides.accessToken || "google_access_token",
  };
}

/**
 * Creates a mock create table request payload for database endpoints.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock create table request payload
 */
function createCreateTableRequest(
  overrides: {
    tableName?: string;
    columns?: Array<{ name: string; type: string; nullable: boolean }>;
    connectionString?: string;
  } = {}
) {
  return {
    connection: {
      provider: "supabase" as const,
      connectionString:
        overrides.connectionString ||
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    },
    tableName: overrides.tableName || "campaign_results",
    columns:
      overrides.columns ||
      [
        { name: "email", type: "text", nullable: false },
        { name: "status", type: "text", nullable: false },
        { name: "sent_at", type: "timestamp", nullable: true },
      ],
  };
}

/**
 * Creates a mock save import request payload for database endpoints.
 *
 * @param overrides - Partial request object to override defaults
 * @returns Mock save import request payload
 */
function createSaveImportRequest(
  overrides: {
    saveName?: string;
    connectionString?: string;
    tableName?: string;
    rows?: Array<Record<string, unknown>>;
  } = {}
) {
  return {
    connection: {
      provider: "supabase" as const,
      connectionString:
        overrides.connectionString ||
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    },
    tableName: overrides.tableName || "campaign_results",
    rows:
      overrides.rows ||
      [
        { email: "user1@example.com", status: "sent", sent_at: new Date().toISOString() },
        { email: "user2@example.com", status: "sent", sent_at: new Date().toISOString() },
      ],
  };
}
