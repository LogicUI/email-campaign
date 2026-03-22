/**
 * Rate limiting utility for API endpoints using rate-limiter-flexible.
 *
 * Uses token bucket algorithm with in-memory storage.
 * Provides different rate limits for different endpoint categories.
 */

import { RateLimiterMemory } from "rate-limiter-flexible";
import type { NextRequest } from "next/server";

/**
 * Rate limit configuration for different endpoint categories.
 */
export interface RateLimitConfig {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
}

/**
 * Rate limit categories with their configurations.
 * Maps to the same limits as the previous implementation.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Default: 100 requests per minute
  default: { points: 100, duration: 60 },

  // AI endpoints: 20 requests per minute (expensive operations)
  ai: { points: 20, duration: 60 },

  // Bulk operations: 10 requests per minute (resource-intensive)
  bulk: { points: 10, duration: 60 },

  // Authentication: 5 requests per 5 minutes (prevent brute force)
  auth: { points: 5, duration: 300 },
};

/**
 * Rate limiter instances for each category.
 * Each category has its own limiter with specific limits.
 */
const limiters = {
  default: new RateLimiterMemory(RATE_LIMITS.default),
  ai: new RateLimiterMemory(RATE_LIMITS.ai),
  bulk: new RateLimiterMemory(RATE_LIMITS.bulk),
  auth: new RateLimiterMemory(RATE_LIMITS.auth),
};

/**
 * Rate limit check result.
 * Maintains compatibility with the previous implementation.
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
export async function checkRateLimit(
  identifier: string,
  category: keyof typeof limiters = "default"
): Promise<RateLimitResult> {
  const limiter = limiters[category] || limiters.default;
  const config = RATE_LIMITS[category] || RATE_LIMITS.default;

  try {
    // Try to consume 1 point
    const result = await limiter.consume(identifier, 1);

    // Request allowed
    return {
      allowed: true,
      limit: config.points,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (rejRes: any) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit: config.points,
      remaining: 0,
      resetAt: new Date(Date.now() + rejRes.msBeforeNext),
      retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
    };
  }
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
  request: NextRequest,
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
export async function rateLimitMiddleware(
  request: NextRequest,
  category: keyof typeof limiters = "default",
  userId?: string
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(request, userId);
  const result = await checkRateLimit(identifier, category);

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
