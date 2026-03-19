import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getAuthSecret } from "@/core/auth/auth-env";

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
  });
  const isAuthenticated = Boolean(token?.email || token?.googleEmail);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
