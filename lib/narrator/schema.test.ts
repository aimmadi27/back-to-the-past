import { describe, it, expect } from "vitest";
import { narrateBodySchema } from "./schema";

const validDiff = {
  fromYear: 2005,
  toYear: 2010,
  titleChanged: true,
  fromTitle: "Old Title",
  toTitle: "New Title",
  addedHeadings: ["About"],
  removedHeadings: ["Services"],
  addedNavLinks: ["Blog"],
  removedNavLinks: [],
  addedTech: ["Bootstrap"],
  removedTech: ["Flash"],
  flashDied: true,
  flashBorn: false,
  metaDescriptionChanged: false,
  fromMetaDescription: "",
  toMetaDescription: "",
  imageCountDelta: 2,
  linkCountDelta: -3,
  addedImageAlts: [],
  removedImageAlts: ["Old Banner"],
  addedMainCopy: [],
  removedMainCopy: [],
};

describe("narrateBodySchema", () => {
  it("accepts a valid body", () => {
    const result = narrateBodySchema.safeParse({ diff: validDiff, domain: "example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing domain", () => {
    const result = narrateBodySchema.safeParse({ diff: validDiff });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid domain (IP address)", () => {
    const result = narrateBodySchema.safeParse({ diff: validDiff, domain: "192.168.1.1" });
    expect(result.success).toBe(false);
  });

  it("rejects a domain with a scheme", () => {
    const result = narrateBodySchema.safeParse({ diff: validDiff, domain: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a string field exceeding 200 chars", () => {
    const longTitle = "A".repeat(201);
    const result = narrateBodySchema.safeParse({
      diff: { ...validDiff, fromTitle: longTitle },
      domain: "example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an array exceeding 20 items", () => {
    const bigArray = Array.from({ length: 21 }, (_, i) => `heading-${i}`);
    const result = narrateBodySchema.safeParse({
      diff: { ...validDiff, addedHeadings: bigArray },
      domain: "example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing diff", () => {
    const result = narrateBodySchema.safeParse({ domain: "example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed diff (missing required field)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { titleChanged: _omit, ...incompleteDiff } = validDiff;
    const result = narrateBodySchema.safeParse({ diff: incompleteDiff, domain: "example.com" });
    expect(result.success).toBe(false);
  });
});
