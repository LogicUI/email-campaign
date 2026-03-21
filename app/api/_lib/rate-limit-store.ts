/**
 * In-memory rate limit store using Map.
 *
 * This simple implementation is suitable for single-instance deployments.
 * For horizontal scaling, consider migrating to Redis/Upstash Redis.
 *
 * Data structure:
 * Map<identifier, { count: number, resetAt: number }>
 */
interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  /**
   * Get current rate limit state for an identifier.
   */
  get(identifier: string): RateLimitEntry | undefined {
    return this.store.get(identifier);
  }

  /**
   * Increment request count for an identifier.
   * Returns the updated entry.
   */
  increment(identifier: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.store.get(identifier);

    // If window has expired, reset counter
    if (!existing || now > existing.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.store.set(identifier, newEntry);
      return newEntry;
    }

    // Increment existing counter
    const updatedEntry: RateLimitEntry = {
      count: existing.count + 1,
      resetAt: existing.resetAt,
    };
    this.store.set(identifier, updatedEntry);
    return updatedEntry;
  }

  /**
   * Reset rate limit for an identifier.
   * Useful for testing or manual overrides.
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries to prevent memory leaks.
   * Call this periodically (e.g., every hour).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(identifier);
      }
    }
  }

  /**
   * Get current store size (useful for monitoring).
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Global rate limit store instance.
 */
export const rateLimitStore = new RateLimitStore();

/**
 * Periodic cleanup of expired entries (runs every hour).
 * This prevents unbounded memory growth.
 */
if (typeof window === "undefined") {
  // Server-side only
  setInterval(() => {
    rateLimitStore.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}
