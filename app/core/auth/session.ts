import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/core/auth/auth-options";

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

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
