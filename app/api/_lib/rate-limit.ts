/**
 * Rate limiting utility for API endpoints.
 *
 * Uses token bucket algorithm with in-memory Map-based storage.
 * Provides different rate limits for different endpoint categories.
 */

import { rateLimitStore } from "./rate-limit-store";

/**
 * Rate limit configuration for different endpoint categories.
 */
export interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
}

/**
 * Rate limit categories with their configurations.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Default: 100 requests per minute
  default: { requests: 100, window: 60 * 1000 },

  // AI endpoints: 20 requests per minute (expensive operations)
  ai: { requests: 20, window: 60 * 1000 },

  // Bulk operations: 10 requests per minute (resource-intensive)
  bulk: { requests: 10, window: 60 * 1000 },

  // Authentication: 5 requests per 5 minutes (prevent brute force)
  auth: { requests: 5, window: 5 * 60 * 1000 },
};

/**
 * Rate limit check result.
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset (when not allowed)
}

/**
 * Check if a request is within rate limits.
 *
 * @param identifier - Unique identifier (user ID or IP address)
 * @param category - Rate limit category key
 * @returns Rate limit check result
 *
 * @example
 * ```ts
 * const result = await checkRateLimit('user-123', 'default');
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': result.retryAfter.toString(),
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': Math.ceil(result.resetAt.getTime() / 1000).toString(),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  category: keyof typeof RATE_LIMITS = "default"
): RateLimitResult {
  const config = RATE_LIMITS[category] || RATE_LIMITS.default;
  const entry = rateLimitStore.increment(identifier, config.window);

  const allowed = entry.count <= config.requests;
  const remaining = Math.max(0, config.requests - entry.count);
  const resetAt = new Date(entry.resetAt);
  const retryAfter = allowed
    ? undefined
    : Math.ceil((entry.resetAt - Date.now()) / 1000);

  return {
    allowed,
    limit: config.requests,
    remaining,
    resetAt,
    retryAfter,
  };
}

/**
 * Extract identifier from request for rate limiting.
 * Uses user ID if authenticated, falls back to IP address.
 *
 * @param request - Next.js request object
 * @param userId - Optional authenticated user ID
 * @returns Identifier string for rate limiting
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Extract IP address from request headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limit middleware for Next.js middleware.ts.
 * Returns 429 response if rate limit exceeded.
 *
 * @param request - Next.js request object
 * @param category - Rate limit category
 * @param userId - Optional authenticated user ID
 * @returns NextResponse if rate limited, null if allowed
 */
export function rateLimitMiddleware(
  request: Request,
  category: keyof typeof RATE_LIMITS = "default",
  userId?: string
): Response | null {
  const identifier = getRateLimitIdentifier(request, userId);
  const result = checkRateLimit(identifier, category);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": result.retryAfter!.toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(result.resetAt.getTime() / 1000).toString(),
        },
      }
    );
  }

  return null;
}
