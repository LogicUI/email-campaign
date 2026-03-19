import type { Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthSecret } from "@/core/auth/auth-env";
import { getServerAuthSession } from "@/core/auth/session";
import type { ApiErrorCode } from "@/types/api";

export function createAuthErrorResponse(code: ApiErrorCode) {
  const error =
    code === "REAUTH_REQUIRED"
      ? "Google access expired. Sign in again to continue."
      : "You must be signed in to continue.";

  return NextResponse.json(
    {
      ok: false,
      code,
      error,
    },
    { status: 401 },
  );
}

export async function requireApiSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return {
      response: createAuthErrorResponse("UNAUTHORIZED"),
    };
  }

  return {
    session,
  } satisfies { session: Session };
}

export async function getAuthToken(request: NextRequest) {
  return getToken({
    req: request,
    secret: getAuthSecret(),
  });
}
