import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { vi } from "vitest";

import { requireApiSession } from "@/api/_lib/api-auth";
import { requireAppUser } from "@/api/_lib/app-user";
import { appUsers } from "@/core/persistence/schema";
import { ensureAppUser } from "@/core/persistence/users-repo";
import { getAppTestDatabase } from "@/tests/setup/test-database";

export interface MockAuthUser {
  id?: string;
  email: string;
  authSubject?: string;
}

/**
 * Creates a mock NextAuth session object for testing.
 *
 * @param user - User object containing email and optional id/authSubject
 * @returns Mock Session object
 */
function createMockSession(user: MockAuthUser): Session {
  const id = user.id || user.authSubject || user.email;

  return {
    user: {
      id,
      email: user.email,
      name: user.email.split("@")[0],
      image: null,
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  } as Session;
}

/**
 * Sets up authenticated state for API route tests.
 * This mocks both requireApiSession and requireAppUser to return a valid session and user ID.
 *
 * @param user - User object containing email and optional id/authSubject
 * @returns Mock session object
 */
export async function mockAuthenticatedUser(user: MockAuthUser): Promise<Session> {
  const session = createMockSession(user);

  // Mock requireApiSession to return the session
  vi.mocked(requireApiSession).mockResolvedValue({
    session,
  } as never);

  const authSubject = user.authSubject || user.id || user.email;

  if ("mockResolvedValueOnce" in requireAppUser && typeof requireAppUser.mockResolvedValueOnce === "function") {
    requireAppUser.mockResolvedValueOnce({
      session,
      userId: authSubject,
    } as never);
  }

  if ("mockResolvedValueOnce" in ensureAppUser && typeof ensureAppUser.mockResolvedValueOnce === "function") {
    ensureAppUser.mockResolvedValueOnce(authSubject);
  }

  try {
    const db = getAppTestDatabase();
    const now = new Date().toISOString();
    const existing = await db.query.appUsers.findFirst({
      where: (table, { eq }) => eq(table.id, authSubject),
    });

    if (!existing) {
      await db.insert(appUsers).values({
        id: authSubject,
        email: user.email,
        authProvider: "google",
        authSubject,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(appUsers)
        .set({
          email: user.email,
          updatedAt: now,
        })
        .where(eq(appUsers.id, authSubject));
    }
  } catch {
    // Some tests mock auth before the in-memory database is initialized.
  }

  return session;
}

/**
 * Sets up unauthenticated state for API route tests.
 * This mocks both requireApiSession and requireAppUser to return 401 responses.
 */
export function mockUnauthenticatedUser(): void {
  const unauthorizedResponse = {
    response: new Response(
      JSON.stringify({
        ok: false,
        code: "UNAUTHORIZED",
        error: "You must be signed in to continue.",
      }),
      { status: 401 }
    ),
  };

  vi.mocked(requireApiSession).mockResolvedValueOnce(unauthorizedResponse as never);
  vi.mocked(requireApiSession).mockResolvedValue(unauthorizedResponse as never);

  if ("mockResolvedValueOnce" in requireAppUser && typeof requireAppUser.mockResolvedValueOnce === "function") {
    requireAppUser.mockResolvedValueOnce(unauthorizedResponse as never);
  }
}

/**
 * Sets up re-authentication required state for API route tests.
 * This is useful for testing expired Google token scenarios.
 */
function mockReauthenticationRequired(): void {
  const reauthResponse = {
    response: new Response(
      JSON.stringify({
        ok: false,
        code: "REAUTH_REQUIRED",
        error: "Google access expired. Sign in again to continue.",
      }),
      { status: 401 }
    ),
  };

  vi.mocked(requireApiSession).mockResolvedValue(reauthResponse as never);

  if ("mockResolvedValueOnce" in requireAppUser && typeof requireAppUser.mockResolvedValueOnce === "function") {
    requireAppUser.mockResolvedValueOnce(reauthResponse as never);
  }
}

/**
 * Clears all authentication mocks.
 * Call this in beforeEach() hooks to ensure test isolation.
 */
export function clearAuthMocks(): void {
  if ("mockClear" in requireApiSession && typeof requireApiSession.mockClear === "function") {
    requireApiSession.mockClear();
  }

  if ("mockClear" in requireAppUser && typeof requireAppUser.mockClear === "function") {
    requireAppUser.mockClear();
  }

  if ("mockClear" in ensureAppUser && typeof ensureAppUser.mockClear === "function") {
    ensureAppUser.mockClear();
  }
}
