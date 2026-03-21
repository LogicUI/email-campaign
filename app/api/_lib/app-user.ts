import type { Session } from "next-auth";

import { ensureAppUser } from "@/core/persistence/users-repo";
import { requireApiSession } from "@/api/_lib/api-auth";

type RequireAppUserResult =
  | {
      response: Response;
    }
  | {
      session: Session;
      userId: string;
    };

export async function requireAppUser(): Promise<RequireAppUserResult> {
  const auth = await requireApiSession();

  if ("response" in auth) {
    return {
      response: auth.response as Response,
    };
  }

  const authSubject = auth.session.user.id || auth.session.user.email;
  const userId = await ensureAppUser({
    email: auth.session.user.email,
    authSubject,
  });

  return {
    session: auth.session,
    userId,
  };
}
