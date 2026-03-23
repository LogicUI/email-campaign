import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/api/campaigns/history/route";

import { resetTestDatabase, getTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import {
  createTestUser,
  createTestCampaignId,
  createTestRecipients,
  createTestCampaignDetail,
} from "@/tests/fixtures/factories";
import { saveCampaignRun } from "@/core/persistence/campaign-history-repo";

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

describe("GET /api/campaigns/history - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const response = await GET();

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Happy Path - Listing Campaigns", () => {
    it("returns empty array for user with no campaigns", async () => {
      mockAuthenticatedUser({ email: "newuser@example.com" });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.campaigns).toEqual([]);
    });

    it("returns all campaigns for authenticated user", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      // Create 3 campaigns for the user
      const campaign1 = createTestCampaignDetail(2, { name: "Campaign 1" });
      const campaign2 = createTestCampaignDetail(2, { name: "Campaign 2" });
      const campaign3 = createTestCampaignDetail(2, { name: "Campaign 3" });

      await saveCampaignRun({
        userId,
        campaign: campaign1,
        recipients: campaign1.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId,
        campaign: campaign2,
        recipients: campaign2.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId,
        campaign: campaign3,
        recipients: campaign3.recipients,
        sourceType: "manual",
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.campaigns).toHaveLength(3);
      expect(json.data.campaigns.map((c: any) => c.name)).toEqual(
        expect.arrayContaining(["Campaign 1", "Campaign 2", "Campaign 3"])
      );
    });

    it("returns campaigns sorted by newest first", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      // Create campaigns with specific timestamps
      const oldestTime = "2024-01-01T10:00:00.000Z";
      const middleTime = "2024-01-02T10:00:00.000Z";
      const newestTime = "2024-01-03T10:00:00.000Z";

      const oldestCampaign = createTestCampaignDetail(1, {
        name: "Oldest Campaign",
        createdAt: oldestTime,
      });

      const middleCampaign = createTestCampaignDetail(1, {
        name: "Middle Campaign",
        createdAt: middleTime,
      });

      const newestCampaign = createTestCampaignDetail(1, {
        name: "Newest Campaign",
        createdAt: newestTime,
      });

      // Save in random order
      await saveCampaignRun({
        userId,
        campaign: middleCampaign,
        recipients: middleCampaign.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId,
        campaign: oldestCampaign,
        recipients: oldestCampaign.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId,
        campaign: newestCampaign,
        recipients: newestCampaign.recipients,
        sourceType: "manual",
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(3);

      // Verify order is newest first
      expect(json.data.campaigns[0].name).toBe("Newest Campaign");
      expect(json.data.campaigns[1].name).toBe("Middle Campaign");
      expect(json.data.campaigns[2].name).toBe("Oldest Campaign");
    });

    it("includes sent/failed counts in campaign summaries", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaign = createTestCampaignDetail(3, { name: "Test Campaign" });

      // Mark recipients with different statuses
      campaign.recipients[0].status = "sent";
      campaign.recipients[0].sent = true;

      campaign.recipients[1].status = "sent";
      campaign.recipients[1].sent = true;

      campaign.recipients[2].status = "failed";
      campaign.recipients[2].sent = false;
      campaign.recipients[2].errorMessage = "Rate limited";

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
        sentAt: new Date().toISOString(),
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(1);

      const savedCampaign = json.data.campaigns[0];
      expect(savedCampaign.sentCount).toBe(2);
      expect(savedCampaign.failedCount).toBe(1);
    });

    it("includes source type in campaign summaries", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      // Create campaigns with different source types
      const manualCampaign = createTestCampaignDetail(1, {
        name: "Manual Campaign",
      });
      const sheetCampaign = createTestCampaignDetail(1, {
        name: "Google Sheet Campaign",
        importedFileName: "sheet.xlsx",
        importedSheetName: "Sheet1",
      });
      const dbCampaign = createTestCampaignDetail(1, {
        name: "DB Campaign",
        importedFileName: "postgres_campaign",
      });

      await saveCampaignRun({
        userId,
        campaign: manualCampaign,
        recipients: manualCampaign.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId,
        campaign: sheetCampaign,
        recipients: sheetCampaign.recipients,
        sourceType: "google_sheet",
      });

      await saveCampaignRun({
        userId,
        campaign: dbCampaign,
        recipients: dbCampaign.recipients,
        sourceType: "database_table",
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(3);

      const sourceTypes = json.data.campaigns.map((c: any) => c.sourceType);
      expect(sourceTypes).toContain("manual");
      expect(sourceTypes).toContain("google_sheet");
      expect(sourceTypes).toContain("database_table");
    });
  });

  describe("User Isolation", () => {
    it("ensures users only see their own campaigns", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 creates campaigns
      const user1Campaign1 = createTestCampaignDetail(1, { name: "User 1 Campaign A" });
      const user1Campaign2 = createTestCampaignDetail(1, { name: "User 1 Campaign B" });

      await saveCampaignRun({
        userId: user1Id,
        campaign: user1Campaign1,
        recipients: user1Campaign1.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId: user1Id,
        campaign: user1Campaign2,
        recipients: user1Campaign2.recipients,
        sourceType: "manual",
      });

      // User 2 creates campaigns
      const user2Campaign1 = createTestCampaignDetail(1, { name: "User 2 Campaign A" });
      const user2Campaign2 = createTestCampaignDetail(1, { name: "User 2 Campaign B" });
      const user2Campaign3 = createTestCampaignDetail(1, { name: "User 2 Campaign C" });

      await saveCampaignRun({
        userId: user2Id,
        campaign: user2Campaign1,
        recipients: user2Campaign1.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId: user2Id,
        campaign: user2Campaign2,
        recipients: user2Campaign2.recipients,
        sourceType: "manual",
      });

      await saveCampaignRun({
        userId: user2Id,
        campaign: user2Campaign3,
        recipients: user2Campaign3.recipients,
        sourceType: "manual",
      });

      // User 1 requests their campaigns
      mockAuthenticatedUser({ id: user1Id, email: "user1@example.com" });

      const response1 = await GET();
      const json1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(json1.data.campaigns).toHaveLength(2);
      expect(json1.data.campaigns.every((c: any) => c.name.includes("User 1"))).toBe(true);

      // User 2 requests their campaigns
      vi.clearAllMocks();
      mockAuthenticatedUser({ id: user2Id, email: "user2@example.com" });

      const response2 = await GET();
      const json2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(json2.data.campaigns).toHaveLength(3);
      expect(json2.data.campaigns.every((c: any) => c.name.includes("User 2"))).toBe(true);
    });

    it("prevents user from accessing another user's campaigns via direct database query", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 creates a campaign
      const user1Campaign = createTestCampaignDetail(2, {
        name: "User 1 Campaign",
      });

      await saveCampaignRun({
        userId: user1Id,
        campaign: user1Campaign,
        recipients: user1Campaign.recipients,
        sourceType: "manual",
      });

      // User 2 authenticates
      mockAuthenticatedUser({ id: user2Id, email: "user2@example.com" });

      // User 2 should not see User 1's campaign
      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("handles campaign with all recipients failed", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaign = createTestCampaignDetail(3, { name: "Failed Campaign" });

      // Mark all recipients as failed
      campaign.recipients.forEach((r) => {
        r.status = "failed";
        r.sent = false;
        r.errorMessage = "Service unavailable";
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
        sentAt: new Date().toISOString(),
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(1);

      const savedCampaign = json.data.campaigns[0];
      expect(savedCampaign.sentCount).toBe(0);
      expect(savedCampaign.failedCount).toBe(3);
    });

    it("handles campaign with no sent recipients (draft status)", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaign = createTestCampaignDetail(2, { name: "Draft Campaign" });

      // All recipients in draft status
      campaign.recipients.forEach((r) => {
        r.status = "draft";
        r.sent = false;
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(1);

      const savedCampaign = json.data.campaigns[0];
      expect(savedCampaign.sentCount).toBe(0);
      expect(savedCampaign.failedCount).toBe(0);
      expect(savedCampaign.sentAt).toBeUndefined();
    });

    it("handles campaign with savedListId", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaign = createTestCampaignDetail(1, {
        name: "Saved List Campaign",
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "reused_history",
        savedListId: "list_123",
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(1);

      const savedCampaign = json.data.campaigns[0];
      expect(savedCampaign.savedListId).toBe("list_123");
    });

    it("handles large number of campaigns efficiently", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      // Create 50 campaigns
      for (let i = 0; i < 50; i++) {
        const campaign = createTestCampaignDetail(1, {
          name: `Campaign ${i}`,
        });

        await saveCampaignRun({
          userId,
          campaign,
          recipients: campaign.recipients,
          sourceType: "manual",
        });
      }

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaigns).toHaveLength(50);

      // Verify sorting is maintained
      expect(json.data.campaigns[0].name).toBe("Campaign 49"); // Last created is first
    });
  });
});
