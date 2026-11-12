import { describe, it, expect } from "vitest";
import { extractFeatures } from "./extract-features";

describe("extractFeatures — tech hints", () => {
  it("detects jQuery from script src filename", () => {
    const html = `<html><head><script src="/js/jquery.min.js"></script></head><body></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).toContain("jQuery");
  });

  it("does NOT detect jQuery from page text mentioning 'jquery'", () => {
    const html = `<html><body><p>This site used to use jQuery for effects.</p></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).not.toContain("jQuery");
  });

  it("detects Bootstrap from CSS link href", () => {
    const html = `<html><head><link rel="stylesheet" href="/css/bootstrap.min.css"></head><body></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).toContain("Bootstrap");
  });

  it("does NOT detect React from page text mentioning 'react'", () => {
    const html = `<html><body><p>We react to your feedback daily.</p></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).not.toContain("React");
  });

  it("detects React from script src", () => {
    const html = `<html><head><script src="/static/react.development.js"></script></head><body></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).toContain("React");
  });

  it("does NOT detect Angular from page text mentioning 'angular'", () => {
    const html = `<html><body><p>The angular design won an award.</p></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).not.toContain("Angular");
  });

  it("detects WordPress from wp-content in image src", () => {
    const html = `<html><body><img src="/wp-content/uploads/2010/logo.png"></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).toContain("WordPress");
  });

  it("detects WordPress from generator meta", () => {
    const html = `<html><head><meta name="generator" content="WordPress 5.9"></head><body></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).toContain("WordPress");
  });

  it("does NOT detect WordPress from page text mentioning 'wordpress'", () => {
    const html = `<html><body><p>Built with WordPress… before we migrated.</p></body></html>`;
    const { techHints } = extractFeatures(html);
    expect(techHints).not.toContain("WordPress");
  });

  it("detects Flash from object data .swf", () => {
    const html = `<html><body><object data="intro.swf"></object></body></html>`;
    const { techHints, hasFlash } = extractFeatures(html);
    expect(techHints).toContain("Flash");
    expect(hasFlash).toBe(true);
  });

  it("detects Flash from embed src .swf", () => {
    const html = `<html><body><embed src="movie.swf"></body></html>`;
    const { hasFlash } = extractFeatures(html);
    expect(hasFlash).toBe(true);
  });

  it("detects Flash from object param value .swf", () => {
    const html = `<html><body><object><param name="movie" value="player.swf"></object></body></html>`;
    const { hasFlash } = extractFeatures(html);
    expect(hasFlash).toBe(true);
  });

  it("does NOT detect Flash from page text mentioning '.swf'", () => {
    // After sanitisation <object>/<embed> are removed, so text mentions should not trigger
    const html = `<html><body><p>We removed the .swf intro in 2012.</p></body></html>`;
    const { hasFlash } = extractFeatures(html);
    expect(hasFlash).toBe(false);
  });

  it("hasFlash and techHints use the same rule", () => {
    const html = `<html><body><object data="intro.swf"></object></body></html>`;
    const { techHints, hasFlash } = extractFeatures(html);
    // Both must be truthy — they share the detection logic
    expect(hasFlash).toBe(true);
    expect(techHints).toContain("Flash");
  });
});

describe("extractFeatures — basic fields", () => {
  it("extracts title", () => {
    const html = `<html><head><title>My Site</title></head><body></body></html>`;
    expect(extractFeatures(html).title).toBe("My Site");
  });

  it("extracts meta description", () => {
    const html = `<html><head><meta name="description" content="A cool site"></head><body></body></html>`;
    expect(extractFeatures(html).metaDescription).toBe("A cool site");
  });

  it("counts images", () => {
    const html = `<html><body><img src="a.png"><img src="b.png"></body></html>`;
    expect(extractFeatures(html).imageCount).toBe(2);
  });

  it("counts links", () => {
    const html = `<html><body><a href="/a">A</a><a href="/b">B</a></body></html>`;
    expect(extractFeatures(html).linkCount).toBe(2);
  });
});

import { diffFeatures } from "./diff-features";
import { narrateBodySchema } from "@/lib/narrator/schema";
import { MAX_STRING, MAX_ARRAY } from "./caps";

describe("extractFeatures — truncation / schema compatibility", () => {
  it("truncates a 500-char title to MAX_STRING", () => {
    const longTitle = "T".repeat(500);
    const html = `<html><head><title>${longTitle}</title></head><body></body></html>`;
    const { title } = extractFeatures(html);
    expect(title.length).toBe(MAX_STRING);
  });

  it("truncates a 500-char heading to MAX_STRING", () => {
    const longHeading = "H".repeat(500);
    const html = `<html><body><h1>${longHeading}</h1></body></html>`;
    const { headings } = extractFeatures(html);
    expect(headings[0].length).toBe(MAX_STRING);
  });

  it("truncates a 500-char metaDescription to MAX_STRING", () => {
    const longDesc = "D".repeat(500);
    const html = `<html><head><meta name="description" content="${longDesc}"></head><body></body></html>`;
    const { metaDescription } = extractFeatures(html);
    expect(metaDescription.length).toBe(MAX_STRING);
  });

  it("truncates imageAlts to MAX_STRING", () => {
    const longAlt = "A".repeat(500);
    const html = `<html><body><img src="x.png" alt="${longAlt}"></body></html>`;
    const { imageAlts } = extractFeatures(html);
    expect(imageAlts[0].length).toBe(MAX_STRING);
  });

  it("caps headings array at MAX_ARRAY items", () => {
    const headingTags = Array.from({ length: MAX_ARRAY + 5 }, (_, i) => `<h2>Heading ${i}</h2>`).join("");
    const html = `<html><body>${headingTags}</body></html>`;
    const { headings } = extractFeatures(html);
    expect(headings.length).toBeLessThanOrEqual(MAX_ARRAY);
  });

  it("produces a FeatureDiff from long-content pages that passes narrateBodySchema", () => {
    const longTitle = "T".repeat(500);
    const longHeading = "H".repeat(500);
    const longAlt = "A".repeat(500);
    const longDesc = "D".repeat(500);

    const fromHtml = `
      <html>
        <head>
          <title>${longTitle}</title>
          <meta name="description" content="${longDesc}">
        </head>
        <body>
          <h1>${longHeading}</h1>
          <img src="x.png" alt="${longAlt}">
        </body>
      </html>`;

    const toHtml = `<html><head><title>Short</title></head><body><h1>New heading</h1></body></html>`;

    const from = extractFeatures(fromHtml);
    const to = extractFeatures(toHtml);
    const diff = diffFeatures(from, 2005, to, 2010);

    const result = narrateBodySchema.safeParse({ diff, domain: "example.com" });
    expect(result.success).toBe(true);
  });
});
