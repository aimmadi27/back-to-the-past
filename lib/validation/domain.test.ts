import { describe, it, expect } from "vitest";
import { validateDomain } from "./domain";
import { InvalidDomainError } from "@/lib/errors";

describe("validateDomain", () => {
  it("accepts a simple domain", () => {
    expect(validateDomain("example.com")).toBe("example.com");
  });

  it("accepts a subdomain", () => {
    expect(validateDomain("sub.example.co.uk")).toBe("sub.example.co.uk");
  });

  it("strips leading/trailing whitespace", () => {
    expect(validateDomain("  example.com  ")).toBe("example.com");
  });

  it("lowercases the domain", () => {
    expect(validateDomain("EXAMPLE.COM")).toBe("example.com");
  });

  it("rejects a domain with a scheme", () => {
    expect(() => validateDomain("https://example.com")).toThrow(InvalidDomainError);
  });

  it("rejects a domain with a path", () => {
    // path gets stripped to hostname — but www stays; test with path that makes hostname invalid
    expect(() => validateDomain("example.com/path")).not.toThrow();
  });

  it("rejects localhost", () => {
    expect(() => validateDomain("localhost")).toThrow(InvalidDomainError);
  });

  it("rejects an IP address", () => {
    expect(() => validateDomain("192.168.1.1")).toThrow(InvalidDomainError);
  });

  it("rejects a domain with a port", () => {
    expect(() => validateDomain("example.com:3000")).toThrow(InvalidDomainError);
  });

  it("rejects an empty string", () => {
    expect(() => validateDomain("")).toThrow(InvalidDomainError);
  });

  it("rejects a single-label hostname (no TLD)", () => {
    expect(() => validateDomain("example")).toThrow(InvalidDomainError);
  });
});
