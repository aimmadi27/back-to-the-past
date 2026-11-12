import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "./rate-limit";

// Export RateLimiter class for testing (not the singleton)
describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 60_000); // 3 requests per minute for tests
  });

  it("allows up to maxRequests in a window", () => {
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
  });

  it("blocks the request after maxRequests", () => {
    limiter.check("ip1");
    limiter.check("ip1");
    limiter.check("ip1");
    expect(limiter.check("ip1")).toBe(false);
  });

  it("tracks IPs independently", () => {
    limiter.check("ip1");
    limiter.check("ip1");
    limiter.check("ip1");
    // ip2 has not been seen yet
    expect(limiter.check("ip2")).toBe(true);
  });

  it("resets after the window expires", () => {
    // Use a very short window
    const shortLimiter = new RateLimiter(1, 1); // 1ms window
    shortLimiter.check("ip1"); // uses the one allowed request
    expect(shortLimiter.check("ip1")).toBe(false); // blocked within window

    // Wait for the window to pass
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortLimiter.check("ip1")).toBe(true); // new window
        resolve();
      }, 10);
    });
  });
});
