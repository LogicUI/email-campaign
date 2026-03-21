import { eq } from "drizzle-orm";

import { createId } from "@/core/utils/ids";
import { getReadyAppDatabase } from "@/core/persistence/app-db";
import { appUsers } from "@/core/persistence/schema";

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

  await db.insert(appUsers).values({
    id: userId,
    email: params.email,
    authProvider: "google",
    authSubject: params.authSubject,
    createdAt: now,
    updatedAt: now,
  });

  return userId;
}
