import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getAuthSecret } from "@/core/auth/auth-env";
import { rateLimitMiddleware, RATE_LIMITS } from "@/api/_lib/rate-limit";

const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Determine rate limit category based on request path.
 */
function getRateLimitCategory(pathname: string): keyof typeof RATE_LIMITS {
  if (pathname.startsWith("/api/ai")) return "ai";
  if (pathname.startsWith("/api/send/bulk")) return "bulk";
  if (pathname.startsWith("/api/auth")) return "auth";
  return "default";
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
  });
  const isAuthenticated = Boolean(token?.email || token?.googleEmail);

  // =========================================================================
  // API Routes: Apply rate limiting
  // =========================================================================
  if (pathname.startsWith("/api")) {
    const category = getRateLimitCategory(pathname);

    // Apply rate limiting (uses user ID if authenticated, IP otherwise)
    const userId = token?.email || token?.googleEmail || undefined;
    const rateLimitResponse = rateLimitMiddleware(
      request,
      category,
      userId
    );

    if (rateLimitResponse) {
      // Log rate limit violation
      console.warn(
        `⚠️  Rate limit exceeded: ${pathname} by ${userId || "unknown"}`
      );
      return rateLimitResponse;
    }

    // Continue to API route
    return NextResponse.next();
  }

  // =========================================================================
  // Page Routes: Apply authentication
  // =========================================================================
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
  matcher: [
    // Include API routes (for rate limiting)
    "/api/:path*",
    // Include page routes (for authentication)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
