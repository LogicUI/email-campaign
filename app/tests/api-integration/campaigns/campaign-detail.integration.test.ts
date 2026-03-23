import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/api/campaigns/[id]/route";

import { resetTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser } from "@/tests/helpers/auth";
import { createTestCampaignId, createTestCampaignDetail } from "@/tests/fixtures/factories";
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

describe("GET /api/campaigns/[id] - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const request = new Request("http://localhost/api/campaigns/test-id");
      const response = await GET(request, { params: { id: "test-id" } } as never);

      expect(response.status).toBe(401);
    });

    it("returns 401 when authentication fails", async () => {
      mockUnauthenticatedUser();

      const campaignId = createTestCampaignId();
      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Happy Path - Getting Campaign Details", () => {
    it("returns campaign details with all recipients", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(3, {
        id: campaignId,
        name: "Test Campaign",
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.campaign.id).toBe(campaignId);
      expect(json.data.campaign.name).toBe("Test Campaign");
      expect(json.data.campaign.recipients).toHaveLength(3);
    });

    it("includes all recipient fields in response", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(2, {
        id: campaignId,
        name: "Detailed Campaign",
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaign.recipients).toHaveLength(2);

      const recipient = json.data.campaign.recipients[0];
      expect(recipient).toHaveProperty("id");
      expect(recipient).toHaveProperty("email");
      expect(recipient).toHaveProperty("subject");
      expect(recipient).toHaveProperty("body");
      expect(recipient).toHaveProperty("sendStatus");
      expect(recipient).toHaveProperty("fields");
      expect(recipient.errorMessage).toBeUndefined();
      expect(recipient.providerMessageId).toBeUndefined();
    });

    it("includes global template in response", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(2, {
        id: campaignId,
        globalSubject: "Global Test Subject",
        globalBodyTemplate: "Hello {{name}}, this is a test.",
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaign.globalSubject).toBe("Global Test Subject");
      expect(json.data.campaign.globalBodyTemplate).toBe("Hello {{name}}, this is a test.");
    });

    it("omits transient AI generation metadata from persisted history", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(2, {
        id: campaignId,
      });

      // Add AI generation metadata
      campaign.recipients[0].bodySource = "ai-generated";
      campaign.recipients[0].lastGeneratedBody = "AI generated body";
      campaign.recipients[0].lastGenerationAt = new Date().toISOString();
      campaign.recipients[0].lastGenerationReasoning = "Reasoning for generation";

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);

      const recipient = json.data.campaign.recipients[0];
      expect(recipient.body).toBe(campaign.recipients[0].body);
      expect(recipient.lastGeneratedBody).toBeUndefined();
      expect(recipient.lastGenerationReasoning).toBeUndefined();
    });

    it("includes send status metadata in recipients", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(2, {
        id: campaignId,
      });

      // Add send metadata
      campaign.recipients[0].status = "sent";
      campaign.recipients[0].sent = true;
      campaign.recipients[0].lastSendAttemptAt = new Date().toISOString();
      campaign.recipients[0].lastProviderMessageId = "gmail_msg_123";

      campaign.recipients[1].status = "failed";
      campaign.recipients[1].sent = false;
      campaign.recipients[1].errorMessage = "Rate limited";
      campaign.recipients[1].lastSendAttemptAt = new Date().toISOString();

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
        sentAt: new Date().toISOString(),
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);

      const sentRecipient = json.data.campaign.recipients[0];
      expect(sentRecipient.sendStatus).toBe("sent");
      expect(sentRecipient.providerMessageId).toBe("gmail_msg_123");
      expect(sentRecipient.sentAt).toBeDefined();

      const failedRecipient = json.data.campaign.recipients[1];
      expect(failedRecipient.sendStatus).toBe("failed");
      expect(failedRecipient.errorMessage).toBe("Rate limited");
    });
  });

  describe("Error Scenarios", () => {
    it("returns 404 for non-existent campaign", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const nonExistentId = "non_existent_campaign_id";

      const request = new Request(`http://localhost/api/campaigns/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId } } as never);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Campaign");
    });

    it("returns 404 when campaign belongs to different user", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 creates a campaign
      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(2, {
        id: campaignId,
        name: "User 1 Campaign",
      });

      await saveCampaignRun({
        userId: user1Id,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      // User 2 tries to access User 1's campaign
      mockAuthenticatedUser({ id: user2Id, email: "user2@example.com" });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.ok).toBe(false);
    });
  });

  describe("User Isolation", () => {
    it("ensures users can only access their own campaigns", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 creates multiple campaigns
      const user1Campaign1 = createTestCampaignDetail(2, { name: "User 1 Campaign A" });
      const user1Campaign2 = createTestCampaignDetail(2, { name: "User 1 Campaign B" });

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

      // User 2 creates a campaign
      const user2Campaign1 = createTestCampaignDetail(2, { name: "User 2 Campaign A" });

      await saveCampaignRun({
        userId: user2Id,
        campaign: user2Campaign1,
        recipients: user2Campaign1.recipients,
        sourceType: "manual",
      });

      // User 1 can access their campaigns
      mockAuthenticatedUser({ id: user1Id, email: "user1@example.com" });

      let request = new Request(`http://localhost/api/campaigns/${user1Campaign1.id}`);
      let response = await GET(request, { params: { id: user1Campaign1.id } } as never);

      expect(response.status).toBe(200);
      let json = await response.json();
      expect(json.data.campaign.name).toBe("User 1 Campaign A");

      request = new Request(`http://localhost/api/campaigns/${user1Campaign2.id}`);
      response = await GET(request, { params: { id: user1Campaign2.id } } as never);

      expect(response.status).toBe(200);

      // User 1 cannot access User 2's campaign
      request = new Request(`http://localhost/api/campaigns/${user2Campaign1.id}`);
      response = await GET(request, { params: { id: user2Campaign1.id } } as never);

      expect(response.status).toBe(404);
    });

    it("prevents unauthorized access to campaign details", async () => {
      const user1Id = "user_1";
      const user2Id = "user_2";

      // User 1 creates a campaign with sensitive data
      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(3, {
        id: campaignId,
        name: "Sensitive Campaign",
      });

      campaign.recipients.forEach((r) => {
        r.fields = {
          ssn: "123-45-6789",
          creditCard: "4111-1111-1111-1111",
        };
      });

      await saveCampaignRun({
        userId: user1Id,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      // User 2 tries to access User 1's campaign
      mockAuthenticatedUser({ id: user2Id, email: "attacker@example.com" });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);

      // Should return 404, not leak sensitive data
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.data).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("handles campaign with empty recipients list", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(0, {
        id: campaignId,
        name: "Empty Campaign",
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaign.recipients).toEqual([]);
    });

    it("handles campaign with all recipients in draft status", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(3, {
        id: campaignId,
        name: "Draft Campaign",
      });

      campaign.recipients.forEach((r) => {
        r.status = "draft";
        r.sent = false;
        r.checked = false;
      });

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaign.recipients.every((r: any) => r.sendStatus === "draft")).toBe(true);
    });

    it("handles campaign with different source types", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      // Google Sheet campaign
      const sheetCampaign = createTestCampaignDetail(2, {
        name: "Sheet Campaign",
        importedFileName: "sheet.xlsx",
        importedSheetName: "Sheet1",
      });

      await saveCampaignRun({
        userId,
        campaign: sheetCampaign,
        recipients: sheetCampaign.recipients,
        sourceType: "google_sheet",
      });

      const request = new Request(`http://localhost/api/campaigns/${sheetCampaign.id}`);
      const response = await GET(request, { params: { id: sheetCampaign.id } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.campaign.sourceType).toBe("google_sheet");
    });

    it("omits transient streaming regeneration metadata", async () => {
      const userId = "user_test_123";
      mockAuthenticatedUser({ id: userId, email: "test@example.com" });

      const campaignId = createTestCampaignId();
      const campaign = createTestCampaignDetail(1, {
        id: campaignId,
      });

      campaign.recipients[0].isRegenerating = true;
      campaign.recipients[0].regenerationPhase = "streaming";
      campaign.recipients[0].streamOriginalBody = "Original body before regeneration";

      await saveCampaignRun({
        userId,
        campaign,
        recipients: campaign.recipients,
        sourceType: "manual",
      });

      const request = new Request(`http://localhost/api/campaigns/${campaignId}`);
      const response = await GET(request, { params: { id: campaignId } } as never);
      const json = await response.json();

      expect(response.status).toBe(200);

      const recipient = json.data.campaign.recipients[0];
      expect(recipient.isRegenerating).toBeUndefined();
      expect(recipient.regenerationPhase).toBeUndefined();
      expect(recipient.streamOriginalBody).toBeUndefined();
    });
  });
});
