import * as cheerio from "cheerio";
import { MAX_STRING, MAX_ARRAY } from "./caps";

/**
 * A set of observable features extracted from a snapshot's HTML.
 * These are what we diff between years — not raw HTML.
 *
 * All string values are truncated to MAX_STRING chars and all arrays to
 * MAX_ARRAY items so that any derived FeatureDiff will pass narrateBodySchema
 * without further processing.
 */
export interface PageFeatures {
  title: string;
  headings: string[];
  navLinks: string[];
  mainCopy: string[]; // paragraphs / notable text blocks
  imageAlts: string[];
  colorMentions: string[]; // CSS color values referenced in <style>
  techHints: string[]; // Flash, jQuery, WordPress markers etc.
  metaDescription: string;
  hasFlash: boolean;
  hasIframe: boolean;
  linkCount: number;
  imageCount: number;
}

/** Extract structured features from raw (sanitised or unsanitised) HTML. */
export function extractFeatures(html: string): PageFeatures {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim().slice(0, MAX_STRING);

  const metaDescription =
    ($('meta[name="description"]').attr("content")?.trim() ?? "").slice(0, MAX_STRING);

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim().slice(0, MAX_STRING);
    if (text) headings.push(text);
  });

  const navLinks: string[] = [];
  $("nav a, header a").each((_, el) => {
    const text = $(el).text().trim();
    // Keep only short labels (they appear in narration); cap to MAX_STRING
    if (text && text.length < 60) navLinks.push(text.slice(0, MAX_STRING));
  });

  const mainCopy: string[] = [];
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    // Keep only non-trivial paragraphs; cap at MAX_STRING
    if (text.length > 40) mainCopy.push(text.slice(0, MAX_STRING));
  });

  const imageAlts: string[] = [];
  $("img[alt]").each((_, el) => {
    const alt = $(el).attr("alt")?.trim().slice(0, MAX_STRING);
    if (alt) imageAlts.push(alt);
  });

  // Pull colour values from inline <style> blocks
  const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)/g;
  const colorMentions: string[] = [];
  $("style").each((_, el) => {
    const css = $(el).text();
    const matches = css.match(colorRegex) ?? [];
    colorMentions.push(...matches.slice(0, MAX_ARRAY));
  });

  // ─── Tech detection from concrete signals only ───────────────────────────
  // Rules: only <script src>, <link href>, <meta name="generator">,
  // wp-content paths, and .swf inside <object>/<embed>.
  // Never match free text — that produces false positives.

  const techHints: string[] = [];

  // Collect all <script src> and <link href> values
  const scriptSrcs: string[] = [];
  $("script[src]").each((_, el) => {
    scriptSrcs.push(($(el).attr("src") ?? "").toLowerCase());
  });
  const linkHrefs: string[] = [];
  $("link[href]").each((_, el) => {
    linkHrefs.push(($(el).attr("href") ?? "").toLowerCase());
  });

  if (scriptSrcs.some((s) => /jquery(\.min)?\.js/.test(s))) {
    techHints.push("jQuery");
  }
  if (
    scriptSrcs.some((s) => /bootstrap(\.min)?\.js/.test(s)) ||
    linkHrefs.some((h) => /bootstrap(\.min)?\.css/.test(h))
  ) {
    techHints.push("Bootstrap");
  }
  if (scriptSrcs.some((s) => /angular(\.min)?\.js/.test(s))) {
    techHints.push("Angular");
  }
  if (scriptSrcs.some((s) => /react(\.min|-dom|\.development)?\.js/.test(s))) {
    techHints.push("React");
  }
  if (scriptSrcs.some((s) => /vue(\.min|\.runtime|\.esm)?\.js/.test(s))) {
    techHints.push("Vue");
  }

  // WordPress: generator meta OR wp-content in any src/href
  const generatorMeta = $('meta[name="generator"]').attr("content") ?? "";
  const allSrcs = [
    ...scriptSrcs,
    ...linkHrefs,
    ...$("img[src]").map((_, el) => ($(el).attr("src") ?? "").toLowerCase()).get(),
  ];
  if (/wordpress/i.test(generatorMeta) || allSrcs.some((s) => s.includes("wp-content"))) {
    techHints.push("WordPress");
  }

  // Flash: .swf referenced inside <object data>, <embed src>, or <object><param value>
  // Single shared rule used for both techHints and hasFlash
  let hasFlash = false;
  $("object, embed").each((_, el) => {
    const data = $(el).attr("data") ?? "";
    const src = $(el).attr("src") ?? "";
    if (/\.swf/i.test(data) || /\.swf/i.test(src)) hasFlash = true;
  });
  $('object param[name="movie"], object param[name="src"]').each((_, el) => {
    const value = $(el).attr("value") ?? "";
    if (/\.swf/i.test(value)) hasFlash = true;
  });
  if (hasFlash) techHints.push("Flash");

  const hasIframe = $("iframe").length > 0;
  const linkCount = $("a[href]").length;
  const imageCount = $("img").length;

  return {
    title,
    headings: dedupe(headings).slice(0, MAX_ARRAY),
    navLinks: dedupe(navLinks).slice(0, MAX_ARRAY),
    mainCopy: mainCopy.slice(0, 10),
    imageAlts: dedupe(imageAlts).slice(0, MAX_ARRAY),
    colorMentions: dedupe(colorMentions).slice(0, MAX_ARRAY),
    techHints: dedupe(techHints),
    metaDescription,
    hasFlash,
    hasIframe,
    linkCount,
    imageCount,
  };
}

function dedupe<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  return arr.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}
