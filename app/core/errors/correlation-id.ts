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

