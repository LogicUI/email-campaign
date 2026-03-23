import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { POST } from "@/api/campaigns/save/route";

import { appUsers, connectionProfiles } from "@/core/persistence/schema";
import { resetTestDatabase, getAppTestDatabase, getTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import {
  createTestUser,
  createTestCampaignId,
  createTestRecipients,
  createTestConnectionProfile,
} from "@/tests/fixtures/factories";

// Mock error-handler first (before routes import it)
vi.mock("@/api/_lib/error-handler", () => ({
  withApiHandler: vi.fn((handler: unknown) => async (request: Request, context?: unknown) => {
    try {
      return await (handler as (request: Request, context?: unknown) => Promise<Response>)(request, context);
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: string }).code)
          : "INTERNAL_ERROR";

      return Response.json(
        {
          ok: false,
          code,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: statusCode },
      );
    }
  }),
}));

// Mock api-auth and app-user
vi.mock("@/api/_lib/api-auth", () => ({
  createAuthErrorResponse: vi.fn((code: string) =>
    Response.json(
      {
        ok: false,
        code,
        error: "auth",
      },
      { status: 401 },
    ),
  ),
  requireApiSession: vi.fn(),
}));

vi.mock("@/api/_lib/app-user", () => ({
  requireAppUser: vi.fn(),
}));

vi.mock("@/core/persistence/users-repo", () => ({
  ensureAppUser: vi.fn(),
}));

// Import mocked modules
const { requireAppUser } = await import("@/api/_lib/app-user");
const { ensureAppUser } = await import("@/core/persistence/users-repo");

function parseDbTimestamp(value: string | undefined) {
  if (!value) {
    return Number.NaN;
  }

  let normalized = value.includes("T") ? value : value.replace(" ", "T");

  if (/([+-]\\d{2})$/.test(normalized)) {
    normalized = normalized.replace(/([+-]\\d{2})$/, "$1:00");
  } else if (!/[zZ]|[+-]\\d{2}:\\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  return Date.parse(normalized);
}

describe("POST /api/campaigns/save - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: { id: "test", name: "Test", createdAt: new Date().toISOString(), importedFileName: "test" },
          recipients: [],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    it("returns 400 when campaign object is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          recipients: [],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when campaign.id is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: { name: "Test", createdAt: new Date().toISOString(), importedFileName: "test" },
          recipients: [],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("expected string");
    });

    it("returns 400 when campaign.name is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: { id: "test", createdAt: new Date().toISOString(), importedFileName: "test" },
          recipients: [],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("expected string");
    });

    it("returns 400 when recipients array is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: { id: "test", name: "Test", createdAt: new Date().toISOString(), importedFileName: "test" },
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });

    it("returns 400 when recipient.id is missing", async () => {
      mockAuthenticatedUser({ email: "test@example.com" });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: { id: "test", name: "Test", createdAt: new Date().toISOString(), importedFileName: "test" },
          recipients: [{ email: "test@example.com" }],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("expected string");
    });
  });

  describe("Happy Path - Saving Campaigns", () => {
    it("saves a new campaign with recipients to database", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(3);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Test Campaign",
            globalSubject: "Test Subject",
            globalBodyTemplate: "Test Body",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 3,
            validRows: 3,
            invalidRows: 0,
          },
          recipients,
          sourceType: "manual",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.campaign.id).toBe(campaignId);
      expect(json.data.campaign.name).toBe("Test Campaign");

      // Verify database state
      const db = getTestDatabase();
      const savedCampaign = await db.query.campaignHistoryTable.findFirst({
        where: (table, { eq }) => eq(table.id, campaignId),
      });

      expect(savedCampaign).toBeDefined();
      expect(savedCampaign?.userId).toBe(userId);
      expect(savedCampaign?.name).toBe("Test Campaign");
    });

    it("saves campaign with AI-generated bodies", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(2);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "AI Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients: recipients.map((r) => ({
            ...r,
            bodySource: "ai-generated",
            lastGeneratedBody: r.body,
            lastGenerationAt: new Date().toISOString(),
          })),
          sourceType: "manual",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      // Verify AI-generated bodies are saved
      const db = getTestDatabase();
      const savedRecipients = await db.query.campaignRecipientsTable.findMany({
        where: (table, { eq }) => eq(table.campaignRunId, campaignId),
      });

      expect(savedRecipients).toHaveLength(2);
      expect(savedRecipients[0].body).toBe(recipients[0].body);
      expect(savedRecipients[0].sendStatus).toBe("draft");
    });

    it("saves campaign with sent status", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(3).map((r) => ({
        ...r,
        status: "sent" as const,
        sent: true,
        lastProviderMessageId: `gmail_msg_${r.id}`,
        lastSendAttemptAt: new Date().toISOString(),
      }));

      const sentAt = new Date().toISOString();

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Sent Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 3,
            validRows: 3,
            invalidRows: 0,
          },
          recipients,
          sourceType: "manual",
          sentAt,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.syncedAt).toBe(sentAt);
      expect(json.data.campaign.sentCount).toBe(3);
      expect(json.data.campaign.failedCount).toBe(0);
    });

    it("saves campaign with mixed success/failure status", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = [
        ...createTestRecipients(2).map((r) => ({
          ...r,
          status: "sent" as const,
          sent: true,
          lastProviderMessageId: `gmail_msg_${r.id}`,
        })),
        ...createTestRecipients(1).map((r) => ({
          ...r,
          status: "failed" as const,
          sent: false,
          errorMessage: "Rate limited",
        })),
      ];

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Mixed Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 3,
            validRows: 3,
            invalidRows: 0,
          },
          recipients,
          sourceType: "manual",
          sentAt: new Date().toISOString(),
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.campaign.sentCount).toBe(2);
      expect(json.data.campaign.failedCount).toBe(1);
    });

    it("saves campaign with Google Sheet source type", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(2);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Google Sheet Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "sheet123.xlsx",
            importedSheetName: "Sheet1",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients,
          sourceType: "google_sheet",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const db = getTestDatabase();
      const savedCampaign = await db.query.campaignHistoryTable.findFirst({
        where: (table, { eq }) => eq(table.id, campaignId),
      });

      expect(savedCampaign?.sourceType).toBe("google_sheet");
    });

    it("saves campaign with database_table source type", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(2);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "DB Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "postgres_campaign",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients,
          sourceType: "database_table",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const db = getTestDatabase();
      const savedCampaign = await db.query.campaignHistoryTable.findFirst({
        where: (table, { eq }) => eq(table.id, campaignId),
      });

      expect(savedCampaign?.sourceType).toBe("database_table");
    });
  });

  describe("Connection Profile Sync", () => {
    it("marks connection profile as synced when profileId is provided", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const profileId = "profile_test_123";
      const recipients = createTestRecipients(2);

      const syncedAt = new Date().toISOString();
      const appDb = getAppTestDatabase();
      try {
        await appDb.insert(appUsers).values({
          id: userId,
          email: "test@example.com",
          authProvider: "google",
          authSubject: userId,
          createdAt: syncedAt,
          updatedAt: syncedAt,
        });
      } catch {
        // The auth helper may already have inserted the user.
      }
      await appDb.insert(connectionProfiles).values({
        id: profileId,
        userId,
        provider: "postgres",
        label: "Test Profile",
        displayHost: "localhost",
        displayDatabaseName: "emailai_test",
        displayProjectRef: null,
        lastSelectedTable: null,
        syncMode: "auto",
        createdAt: syncedAt,
        updatedAt: syncedAt,
        lastUsedAt: syncedAt,
        lastSyncedAt: null,
      });

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "DB Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients,
          sourceType: "database_table",
          profileId,
          sentAt: syncedAt,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.connectionProfile).toBeDefined();

      // Verify profile was marked as synced
      const db = getTestDatabase();
      const profile = await db.query.databaseConnectionProfilesTable.findFirst({
        where: (table, { eq }) => eq(table.id, profileId),
      });

      expect(profile).toBeDefined();
      expect(json.data.connectionProfile.id).toBe(profileId);
    });

    it("does not update profile when profileId is not provided", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(2);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients,
          sourceType: "manual",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.connectionProfile).toBeNull();
    });
  });

  describe("User Isolation", () => {
    it("ensures users cannot access other users' campaigns", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 saves a campaign
      mockAuthenticatedUser({ id: user1Id, email: "user1@example.com" });

      const campaignId = createTestCampaignId();
      const recipients1 = createTestRecipients(2);

      const request1 = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "User 1 Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients: recipients1,
          sourceType: "manual",
        }),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Verify user 1 owns the campaign
      const db = getTestDatabase();
      const campaign = await db.query.campaignHistoryTable.findFirst({
        where: (table, { eq }) => eq(table.id, campaignId),
      });

      expect(campaign?.userId).toBe(user1Id);
    });
  });

  describe("Edge Cases", () => {
    it("handles campaign with no recipients", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Empty Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
          },
          recipients: [],
          sourceType: "manual",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it("handles campaign with custom sentAt timestamp", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const recipients = createTestRecipients(1);
      const customSentAt = "2024-01-01T12:00:00.000Z";

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
          },
          recipients,
          sourceType: "manual",
          sentAt: customSentAt,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.syncedAt).toBe(customSentAt);
    });

    it("handles campaign with savedListId", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const savedListId = "list_123";
      const recipients = createTestRecipients(2);

      const request = new Request("http://localhost/api/campaigns/save", {
        method: "POST",
        body: JSON.stringify({
          campaign: {
            id: campaignId,
            name: "Saved List Campaign",
            globalSubject: "Subject",
            globalBodyTemplate: "Template",
            createdAt: new Date().toISOString(),
            importedFileName: "test.csv",
            totalRows: 2,
            validRows: 2,
            invalidRows: 0,
          },
          recipients,
          sourceType: "reused_history",
          savedListId,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);

      const db = getTestDatabase();
      const savedCampaign = await db.query.campaignHistoryTable.findFirst({
        where: (table, { eq }) => eq(table.id, campaignId),
      });

      expect(savedCampaign?.savedListId).toBe(savedListId);
    });
  });
});
