/**
 * Simple in-memory per-IP rate limiter.
 * Suitable for a hackathon — not for multi-instance production.
 *
 * Allows up to `maxRequests` per `windowMs` per IP.
 */

interface BucketEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private buckets = new Map<string, BucketEntry>();

  constructor(
    private readonly maxRequests: number = 10,
    private readonly windowMs: number = 60_000
  ) {}

  /**
   * Returns true if the request is allowed, false if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      // New window
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  /** Exposed for tests only. */
  _reset(key: string): void {
    this.buckets.delete(key);
  }
}

/** Singleton — shared across all requests in the same server instance. */
export const rateLimiter = new RateLimiter(10, 60_000);
