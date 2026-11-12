import { describe, it, expect } from "vitest";
import { buildNarratorPrompt } from "./build-prompt";
import type { FeatureDiff } from "@/lib/diff/diff-features";

const baseDiff: FeatureDiff = {
  fromYear: 2005,
  toYear: 2010,
  titleChanged: false,
  fromTitle: "Example",
  toTitle: "Example",
  addedHeadings: [],
  removedHeadings: [],
  addedNavLinks: [],
  removedNavLinks: [],
  addedTech: [],
  removedTech: [],
  flashDied: false,
  flashBorn: false,
  metaDescriptionChanged: false,
  fromMetaDescription: "",
  toMetaDescription: "",
  imageCountDelta: 0,
  linkCountDelta: 0,
  addedImageAlts: [],
  removedImageAlts: [],
  addedMainCopy: [],
  removedMainCopy: [],
};

describe("buildNarratorPrompt", () => {
  it("includes domain and years", () => {
    const prompt = buildNarratorPrompt(baseDiff, "example.com");
    expect(prompt).toContain("example.com");
    expect(prompt).toContain("2005");
    expect(prompt).toContain("2010");
  });

  it("mentions Flash dying when flashDied is true", () => {
    const diff = { ...baseDiff, flashDied: true };
    const prompt = buildNarratorPrompt(diff, "example.com");
    expect(prompt.toLowerCase()).toContain("flash");
  });

  it("mentions removed headings", () => {
    const diff = { ...baseDiff, removedHeadings: ["Buy Now", "Contact Us"] };
    const prompt = buildNarratorPrompt(diff, "example.com");
    expect(prompt).toContain("Buy Now");
    expect(prompt).toContain("Contact Us");
  });

  it("mentions title change", () => {
    const diff = { ...baseDiff, titleChanged: true, fromTitle: "Old Co", toTitle: "New Co" };
    const prompt = buildNarratorPrompt(diff, "example.com");
    expect(prompt).toContain("Old Co");
    expect(prompt).toContain("New Co");
  });

  it("falls back to no-changes message when diff is empty", () => {
    const prompt = buildNarratorPrompt(baseDiff, "example.com");
    expect(prompt).toContain("No significant changes detected");
  });

  it("instructs the model NOT to hallucinate", () => {
    const prompt = buildNarratorPrompt(baseDiff, "example.com");
    expect(prompt.toLowerCase()).toMatch(/only describe|do not invent|only.*changes/);
  });
});
