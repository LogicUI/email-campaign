/**
 * Error correlation ID generation and management.
 *
 * Correlation IDs uniquely identify errors and requests for tracking
 * across logs, monitoring, and user-facing error messages.
 */

/**
 * Generate a unique correlation ID for error tracking.
 *
 * Format: {timestamp}-{random}
 * Example: 20240321-123456-abc123
 *
 * The format is designed to be:
 * - Human-readable (sortable by timestamp)
 * - Unique (random component prevents collisions)
 * - URL-safe (only alphanumeric and hyphens)
 *
 * @returns A unique correlation ID string
 *
 * @example
 * ```ts
 * const id = generateCorrelationId();
 * console.log(id); // "20240321-143052-a7f3b9c1"
 * ```
 */
export function generateCorrelationId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 15); // "20240321143052"

  const random = Math.random().toString(36).slice(2, 9); // "a7f3b9c1"

  return `${timestamp}-${random}`;
}

/**
 * Extract or generate correlation ID from various sources.
 *
 * This helper function checks for existing correlation IDs in:
 * 1. Request headers (X-Correlation-ID)
 * 2. Error objects (error.correlationId)
 * 3. Generates a new one if not found
 *
 * @param source - Request, error, or other object containing correlation ID
 * @returns Correlation ID string
 *
 * @example
 * ```ts
 * // From request headers
 * const id1 = getCorrelationId(request);
 *
 * // From error object
 * const id2 = getCorrelationId(error);
 *
 * // Generate new if not found
 * const id3 = getCorrelationId();
 * ```
 */
export function getCorrelationId(source?: {
  headers?: { get: (name: string) => string | null };
  correlationId?: string;
}): string {
  if (!source) {
    return generateCorrelationId();
  }

  // Check headers first
  if (source.headers) {
    const headerId = source.headers.get("X-Correlation-ID");
    if (headerId) {
      return headerId;
    }
  }

  // Check object property
  if (source.correlationId) {
    return source.correlationId;
  }

  // Generate new ID
  return generateCorrelationId();
}

/**
 * Correlation ID middleware for Next.js.
 * Adds X-Correlation-ID header to all responses.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { correlationIdMiddleware } from '@/core/errors/correlation-id';
 *
 * export async function middleware(request: NextRequest) {
 *   const response = correlationIdMiddleware(request);
 *   if (response) return response;
 *   // ... rest of middleware
 * }
 * ```
 */
export function addCorrelationIdToHeaders(
  headers: Headers,
  correlationId?: string
): void {
  const id = correlationId || generateCorrelationId();
  headers.set("X-Correlation-ID", id);
}
