import { describe, it, expect } from "vitest";
import { validateOriginalUrl } from "./validate-original";
import { InvalidDomainError } from "@/lib/errors";

describe("validateOriginalUrl", () => {
  it("accepts an exact hostname match (http)", () => {
    expect(validateOriginalUrl("http://example.com/", "example.com")).toBe(
      "http://example.com/"
    );
  });

  it("accepts an exact hostname match (https)", () => {
    expect(validateOriginalUrl("https://example.com/page", "example.com")).toBe(
      "https://example.com/page"
    );
  });

  it("accepts a www. prefixed original for the base domain", () => {
    expect(
      validateOriginalUrl("http://www.example.com/", "example.com")
    ).toBe("http://www.example.com/");
  });

  it("accepts a subdomain of the domain", () => {
    expect(
      validateOriginalUrl("https://store.example.com/", "example.com")
    ).toBe("https://store.example.com/");
  });

  it("rejects an empty original", () => {
    expect(() => validateOriginalUrl("", "example.com")).toThrow(InvalidDomainError);
  });

  it("rejects a non-URL string", () => {
    expect(() => validateOriginalUrl("not a url", "example.com")).toThrow(
      InvalidDomainError
    );
  });

  it("rejects a javascript: scheme", () => {
    expect(() =>
      validateOriginalUrl("javascript:alert(1)", "example.com")
    ).toThrow(InvalidDomainError);
  });

  it("rejects an original whose hostname does not match the domain", () => {
    expect(() =>
      validateOriginalUrl("http://evil.com/", "example.com")
    ).toThrow(InvalidDomainError);
  });

  it("rejects an original that merely contains the domain as a path segment", () => {
    expect(() =>
      validateOriginalUrl("http://evil.com/example.com/", "example.com")
    ).toThrow(InvalidDomainError);
  });

  it("rejects data: URIs", () => {
    expect(() =>
      validateOriginalUrl("data:text/html,<script>alert(1)</script>", "example.com")
    ).toThrow(InvalidDomainError);
  });
});
