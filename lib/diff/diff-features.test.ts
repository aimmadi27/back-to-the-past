import { describe, it, expect } from "vitest";
import { diffFeatures } from "./diff-features";
import type { PageFeatures } from "./extract-features";

const base: PageFeatures = {
  title: "Example Site",
  headings: ["Welcome", "About Us"],
  navLinks: ["Home", "About", "Contact"],
  mainCopy: ["We make great things."],
  imageAlts: ["Logo"],
  colorMentions: ["#ff0000"],
  techHints: ["Flash/ActiveX", "jQuery"],
  metaDescription: "An example site",
  hasFlash: true,
  hasIframe: false,
  linkCount: 10,
  imageCount: 5,
};

describe("diffFeatures", () => {
  it("detects title change", () => {
    const next = { ...base, title: "New Title" };
    const diff = diffFeatures(base, 2005, next, 2010);
    expect(diff.titleChanged).toBe(true);
    expect(diff.fromTitle).toBe("Example Site");
    expect(diff.toTitle).toBe("New Title");
  });

  it("detects flash dying", () => {
    const next = { ...base, hasFlash: false, techHints: ["jQuery"] };
    const diff = diffFeatures(base, 2005, next, 2010);
    expect(diff.flashDied).toBe(true);
    expect(diff.flashBorn).toBe(false);
    expect(diff.removedTech).toContain("Flash/ActiveX");
  });

  it("detects added nav links", () => {
    const next = { ...base, navLinks: ["Home", "About", "Contact", "Blog"] };
    const diff = diffFeatures(base, 2005, next, 2010);
    expect(diff.addedNavLinks).toContain("Blog");
    expect(diff.removedNavLinks).toHaveLength(0);
  });

  it("detects removed headings", () => {
    const next = { ...base, headings: ["Welcome"] };
    const diff = diffFeatures(base, 2005, next, 2010);
    expect(diff.removedHeadings).toContain("About Us");
    expect(diff.addedHeadings).toHaveLength(0);
  });

  it("computes image count delta", () => {
    const next = { ...base, imageCount: 8 };
    const diff = diffFeatures(base, 2005, next, 2010);
    expect(diff.imageCountDelta).toBe(3);
  });

  it("reports no changes for identical features", () => {
    const diff = diffFeatures(base, 2005, base, 2010);
    expect(diff.titleChanged).toBe(false);
    expect(diff.flashDied).toBe(false);
    expect(diff.addedNavLinks).toHaveLength(0);
    expect(diff.removedNavLinks).toHaveLength(0);
  });
});
