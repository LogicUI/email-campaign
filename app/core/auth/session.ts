import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/core/auth/auth-options";

/**
 * Fetches the current server-side auth session using the app's auth options.
 *
 * @returns Current NextAuth session or `null` when the user is not authenticated.
 */
export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Ensures a page request has an authenticated session before continuing.
 *
 * This keeps page-level auth checks consistent and centralizes the redirect behavior
 * for unauthenticated requests.
 *
 * @param params.callbackUrl URL to preserve as the post-login return target.
 * @param params.redirectTo Optional explicit login redirect override.
 * @returns Authenticated session object.
 */
export async function requirePageSession(params?: {
  callbackUrl?: string;
  redirectTo?: string;
}): Promise<Session> {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    const callbackUrl = encodeURIComponent(params?.callbackUrl ?? "/");
    redirect(params?.redirectTo ?? `/login?callbackUrl=${callbackUrl}`);
  }

  return session;
}
