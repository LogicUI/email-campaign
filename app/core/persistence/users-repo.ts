import { eq } from "drizzle-orm";

import { createId } from "@/core/utils/ids";
import { getReadyAppDatabase } from "@/core/persistence/app-db";
import { appUsers } from "@/core/persistence/schema";

function isUniqueConstraintError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    return true;
  }

  if (
    error &&
    typeof error === "object" &&
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "code" in error.cause &&
    error.cause.code === "23505"
  ) {
    return true;
  }

  return false;
}

/**
 * Ensures that the authenticated user exists in the app-owned persistence database.
 *
 * NextAuth gives us the external identity, but the rest of the persistence layer
 * needs a stable app-owned user id for foreign keys. This function either updates the
 * existing user record for the auth subject or creates one on first use.
 *
 * @param params.email Current email address reported by the auth provider.
 * @param params.authSubject Stable provider subject identifier used as the lookup key.
 * @returns App-owned user id that should be used for subsequent repository operations.
 */
export async function ensureAppUser(params: {
  email: string;
  authSubject: string;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return params.authSubject;
  }

  const existing = await db
    .select({
      id: appUsers.id,
    })
    .from(appUsers)
    .where(eq(appUsers.authSubject, params.authSubject))
    .limit(1);

  const now = new Date().toISOString();

  if (existing[0]) {
    await db
      .update(appUsers)
      .set({
        email: params.email,
        updatedAt: now,
      })
      .where(eq(appUsers.id, existing[0].id));

    return existing[0].id;
  }

  const userId = createId("user");

  try {
    await db.insert(appUsers).values({
      id: userId,
      email: params.email,
      authProvider: "google",
      authSubject: params.authSubject,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const concurrentExisting = await db
      .select({
        id: appUsers.id,
      })
      .from(appUsers)
      .where(eq(appUsers.authSubject, params.authSubject))
      .limit(1);

    if (!concurrentExisting[0]) {
      throw error;
    }

    await db
      .update(appUsers)
      .set({
        email: params.email,
        updatedAt: now,
      })
      .where(eq(appUsers.id, concurrentExisting[0].id));

    return concurrentExisting[0].id;
  }
}
