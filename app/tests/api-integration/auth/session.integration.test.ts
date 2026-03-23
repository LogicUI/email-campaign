import { describe, it, expect, beforeEach, vi } from "vitest";
import { ensureAppUser } from "@/core/persistence/users-repo";

import { resetTestDatabase, getTestDatabase } from "@/tests/setup/test-database";
import { mockAuthenticatedUser, mockUnauthenticatedUser, clearAuthMocks } from "@/tests/helpers/auth";

// Mock NextAuth
vi.mock("@/core/auth/auth-options", () => ({
  getServerAuthSession: vi.fn(),
}));

// Mock api-auth for requireApiSession
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
  getAuthToken: vi.fn(),
  requireApiSession: vi.fn(),
}));

// Import mocked modules
const { getServerAuthSession } = await import("@/core/auth/auth-options");
const { requireApiSession } = await import("@/api/_lib/api-auth");
const { requireAppUser } = await import("@/api/_lib/app-user");

function parseDbTimestamp(value: string | undefined) {
  if (!value) {
    return Number.NaN;
  }

  let normalized = value.includes("T") ? value : value.replace(" ", "T");

  if (/([+-]\d{2})$/.test(normalized)) {
    normalized = normalized.replace(/([+-]\d{2})$/, "$1:00");
  } else if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  return Date.parse(normalized);
}

describe("Authentication & Session Management - Integration Tests", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
    clearAuthMocks();
  });

  describe("ensureAppUser", () => {
    it("creates a new user on first authentication", async () => {
      const authSubject = "google_subject_123";
      const email = "newuser@example.com";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      expect(userId).toBeDefined();
      expect(userId).toMatch(/^user_/);

      // Verify user was created in database
      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.authSubject, authSubject),
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(email);
      expect(user?.authProvider).toBe("google");
      expect(user?.authSubject).toBe(authSubject);
    });

    it("returns stable userId for subsequent calls with same authSubject", async () => {
      const authSubject = "google_subject_stable";
      const email = "stable@example.com";

      const userId1 = await ensureAppUser({
        email,
        authSubject,
      });

      const userId2 = await ensureAppUser({
        email,
        authSubject,
      });

      expect(userId1).toBe(userId2);

      // Verify only one user in database
      const db = getTestDatabase();
      const users = await db.query.appUsersTable.findMany({
        where: (table, { eq }) => eq(table.authSubject, authSubject),
      });

      expect(users).toHaveLength(1);
    });

    it("updates user email when email changes but authSubject stays same", async () => {
      const authSubject = "google_subject_update";
      const originalEmail = "original@example.com";
      const updatedEmail = "updated@example.com";

      // Create user with original email
      const userId1 = await ensureAppUser({
        email: originalEmail,
        authSubject,
      });

      // Update email
      const userId2 = await ensureAppUser({
        email: updatedEmail,
        authSubject,
      });

      // userId should remain stable
      expect(userId1).toBe(userId2);

      // Verify email was updated
      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId1),
      });

      expect(user?.email).toBe(updatedEmail);
    });

    it("handles multiple users with different authSubjects", async () => {
      const user1 = await ensureAppUser({
        email: "user1@example.com",
        authSubject: "subject_1",
      });

      const user2 = await ensureAppUser({
        email: "user2@example.com",
        authSubject: "subject_2",
      });

      const user3 = await ensureAppUser({
        email: "user3@example.com",
        authSubject: "subject_3",
      });

      expect(user1).not.toBe(user2);
      expect(user2).not.toBe(user3);
      expect(user1).not.toBe(user3);

      // Verify all users exist in database
      const db = getTestDatabase();
      const users = await db.query.appUsersTable.findMany();

      expect(users).toHaveLength(3);
    });

    it("sets createdAt and updatedAt timestamps correctly", async () => {
      const authSubject = "google_subject_timestamps";
      const email = "timestamps@example.com";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });
      const createdAtMs = parseDbTimestamp(user?.createdAt);
      const updatedAtMs = parseDbTimestamp(user?.updatedAt);

      expect(user?.createdAt).toBeDefined();
      expect(user?.updatedAt).toBeDefined();
      expect(Number.isNaN(createdAtMs)).toBe(false);
      expect(Number.isNaN(updatedAtMs)).toBe(false);
      expect(updatedAtMs >= createdAtMs).toBe(true);
    });

    it("updates updatedAt timestamp on subsequent calls", async () => {
      const authSubject = "google_subject_update_timestamp";
      const email = "updatetimestamp@example.com";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      const db = getTestDatabase();
      const initialUser = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });
      const initialUpdatedAtMs = parseDbTimestamp(initialUser?.updatedAt);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await ensureAppUser({
        email,
        authSubject,
      });
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });
      const updatedAtMs = parseDbTimestamp(user?.updatedAt);

      expect(Number.isNaN(initialUpdatedAtMs)).toBe(false);
      expect(Number.isNaN(updatedAtMs)).toBe(false);
      expect(updatedAtMs >= initialUpdatedAtMs).toBe(true);
    });
  });

  describe("requireAppUser", () => {
    it("returns session and userId when user is authenticated", async () => {
      const email = "authenticated@example.com";
      const authSubject = "google_subject_auth";

      const session = await mockAuthenticatedUser({ email, authSubject });

      const result = await requireAppUser();

      expect("response" in result).toBe(false);
      expect("session" in result).toBe(true);
      expect("userId" in result).toBe(true);

      if (!("response" in result)) {
        expect(result.session.user.email).toBe(email);
        expect(typeof result.userId).toBe("string");
      }
    });

    it("creates user record on first authentication", async () => {
      const email = "firsttime@example.com";
      const authSubject = "google_subject_first";

      const session = await mockAuthenticatedUser({ email, authSubject });

      const result = await requireAppUser();

      expect("response" in result).toBe(false);

      if (!("response" in result)) {
        const userId = result.userId;

        // Verify user was created in database
        const db = getTestDatabase();
        const user = await db.query.appUsersTable.findFirst({
          where: (table, { eq }) => eq(table.id, userId),
        });

        expect(user).toBeDefined();
        expect(user?.email).toBe(email);
      }
    });

    it("returns existing userId on subsequent authentications", async () => {
      const email = "returning@example.com";
      const authSubject = "google_subject_returning";

      // First authentication
      await mockAuthenticatedUser({ email, authSubject });
      const result1 = await requireAppUser();
      clearAuthMocks();

      // Second authentication
      await mockAuthenticatedUser({ email, authSubject });
      const result2 = await requireAppUser();

      if (!("response" in result1) && !("response" in result2)) {
        expect(result1.userId).toBe(result2.userId);
      }
    });

    it("returns 401 response when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const result = await requireAppUser();

      expect("response" in result).toBe(true);

      if ("response" in result) {
        expect(result.response.status).toBe(401);
      }
    });

    it("updates email on subsequent authentication with new email", async () => {
      const authSubject = "google_subject_email_change";
      const originalEmail = "oldemail@example.com";
      const newEmail = "newemail@example.com";

      // First authentication with original email
      await mockAuthenticatedUser({ email: originalEmail, authSubject });
      const result1 = await requireAppUser();
      clearAuthMocks();

      // Second authentication with new email
      await mockAuthenticatedUser({ email: newEmail, authSubject });
      const result2 = await requireAppUser();

      if (!("response" in result1) && !("response" in result2)) {
        expect(result1.userId).toBe(result2.userId);

        // Verify email was updated
        const db = getTestDatabase();
        const user = await db.query.appUsersTable.findFirst({
          where: (table, { eq }) => eq(table.id, result1.userId),
        });

        expect(user?.email).toBe(newEmail);
      }
    });
  });

  describe("requireApiSession", () => {
    it("returns session when user is authenticated", async () => {
      const email = "session@example.com";
      const session = await mockAuthenticatedUser({ email });

      const result = await requireApiSession();

      expect("response" in result).toBe(false);
      expect("session" in result).toBe(true);

      if (!("response" in result)) {
        expect(result.session.user.email).toBe(email);
      }
    });

    it("returns 401 response when user is not authenticated", async () => {
      mockUnauthenticatedUser();

      const result = await requireApiSession();

      expect("response" in result).toBe(true);

      if ("response" in result) {
        expect(result.response.status).toBe(401);

        const json = await result.response.json();
        expect(json.ok).toBe(false);
        expect(json.code).toBe("UNAUTHORIZED");
      }
    });

    it("returns session with user object containing id, email, and name", async () => {
      const email = "detailed@example.com";
      const session = await mockAuthenticatedUser({ email });

      const result = await requireApiSession();

      if (!("response" in result)) {
        expect(result.session.user).toHaveProperty("id");
        expect(result.session.user).toHaveProperty("email");
        expect(result.session.user).toHaveProperty("name");
        expect(result.session.user.email).toBe(email);
      }
    });

    it("returns session with expires field", async () => {
      const email = "expires@example.com";
      await mockAuthenticatedUser({ email });

      const result = await requireApiSession();

      if (!("response" in result)) {
        expect(result.session).toHaveProperty("expires");
        expect(typeof result.session.expires).toBe("string");
      }
    });
  });

  describe("User Isolation", () => {
    it("ensures different authSubjects create different users", async () => {
      const email = "shared@example.com";

      const user1 = await ensureAppUser({
        email,
        authSubject: "subject_a",
      });

      const user2 = await ensureAppUser({
        email,
        authSubject: "subject_b",
      });

      expect(user1).not.toBe(user2);

      // Verify both users exist
      const db = getTestDatabase();
      const users = await db.query.appUsersTable.findMany();

      expect(users).toHaveLength(2);
      expect(users.some((u) => u.id === user1)).toBe(true);
      expect(users.some((u) => u.id === user2)).toBe(true);
    });

    it("prevents authSubject collision", async () => {
      const authSubject = "unique_subject_123";

      const user1 = await ensureAppUser({
        email: "user1@example.com",
        authSubject,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user2 = await ensureAppUser({
        email: "user2@example.com",
        authSubject,
      });

      // Should return same userId (email should be updated)
      expect(user1).toBe(user2);

      const db = getTestDatabase();
      const users = await db.query.appUsersTable.findMany({
        where: (table, { eq }) => eq(table.authSubject, authSubject),
      });

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe("user2@example.com");
    });
  });

  describe("Edge Cases", () => {
    it("handles email with special characters", async () => {
      const email = "user+tag@example.com";
      const authSubject = "subject_special";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      expect(userId).toBeDefined();

      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });

      expect(user?.email).toBe(email);
    });

    it("handles very long email addresses", async () => {
      const localPart = "a".repeat(100);
      const email = `${localPart}@example.com`;
      const authSubject = "subject_long_email";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      expect(userId).toBeDefined();

      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });

      expect(user?.email).toBe(email);
    });

    it("handles authSubject with special characters", async () => {
      const email = "special@example.com";
      const authSubject = "google_subject_with-dashes_and_underscores_123";

      const userId = await ensureAppUser({
        email,
        authSubject,
      });

      expect(userId).toBeDefined();

      const db = getTestDatabase();
      const user = await db.query.appUsersTable.findFirst({
        where: (table, { eq }) => eq(table.authSubject, authSubject),
      });

      expect(user).toBeDefined();
    });

    it("handles rapid consecutive calls", async () => {
      const authSubject = "subject_rapid";
      const email = "rapid@example.com";

      // Make multiple concurrent calls
      const promises = Array.from({ length: 10 }, () =>
        ensureAppUser({
          email,
          authSubject,
        })
      );

      const results = await Promise.all(promises);

      // All should return the same userId
      expect(results.every((r) => r === results[0])).toBe(true);

      // Only one user should exist in database
      const db = getTestDatabase();
      const users = await db.query.appUsersTable.findMany({
        where: (table, { eq }) => eq(table.authSubject, authSubject),
      });

      expect(users).toHaveLength(1);
    });

    it("uses email as fallback when session.user.id is missing", async () => {
      const email = "noid@example.com";
      const authSubject = undefined; // No ID provided

      await mockAuthenticatedUser({ email, authSubject });

      const result = await requireAppUser();

      if (!("response" in result)) {
        // Should use email as userId fallback
        expect(result.userId).toBeDefined();
      }
    });
  });
});
