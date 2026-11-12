import * as cheerio from "cheerio";

const WAYBACK_BASE = "https://web.archive.org/web";

/**
 * Rewrite asset URLs in raw archived HTML so they resolve through the
 * Wayback Machine's CDX asset modifiers:
 *   - images  → im_
 *   - CSS     → cs_
 *   - other   → if_
 *
 * This keeps images and stylesheets loading even when browsing the
 * sanitised snapshot inside an iframe.
 */
export function rewriteAssetUrls(html: string, timestamp: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  const base = normalizeBase(baseUrl);

  // <img src>
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) $(el).attr("src", rewrite(src, timestamp, base, "im_"));
  });

  // <link rel="stylesheet" href>
  $('link[rel="stylesheet"][href]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) $(el).attr("href", rewrite(href, timestamp, base, "cs_"));
  });

  // <script src> — these will be stripped later by the sanitiser, but
  // rewriting first keeps the pipeline order flexible.
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) $(el).attr("src", rewrite(src, timestamp, base, "if_"));
  });

  // <source srcset> and <source src> (picture/video elements)
  $("source[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) $(el).attr("src", rewrite(src, timestamp, base, "if_"));
  });

  // Background images in inline style
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    const rewritten = style.replace(/url\(['"]?([^'")]+)['"]?\)/g, (_, url) => {
      return `url(${rewrite(url, timestamp, base, "im_")})`;
    });
    $(el).attr("style", rewritten);
  });

  // <a href> — rewrite internal links to Wayback and open in a new tab
  // so they don't navigate our iframe away from the snapshot URL.
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // Skip anchors, javascript:, mailto:, and already-rewritten Wayback URLs
    if (
      href.startsWith("#") ||
      /^javascript:/i.test(href) ||
      /^mailto:/i.test(href) ||
      href.includes("web.archive.org")
    ) {
      return;
    }
    $(el).attr("href", rewrite(href, timestamp, base, "id_"));
    $(el).attr("target", "_blank");
    $(el).attr("rel", "noopener noreferrer");
  });

  return $.html();
}

function normalizeBase(baseUrl: string): string {
  try {
    const u = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
    return u.origin;
  } catch {
    return "";
  }
}

function rewrite(
  src: string,
  timestamp: string,
  base: string,
  modifier: string
): string {
  // Already a Wayback URL — leave it alone
  if (src.includes("web.archive.org")) return src;

  // Data URIs or empty — leave alone
  if (!src || src.startsWith("data:")) return src;

  let absolute: string;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    absolute = src;
  } else if (src.startsWith("//")) {
    absolute = `https:${src}`;
  } else if (src.startsWith("/")) {
    absolute = base ? `${base}${src}` : src;
  } else {
    // relative path — best-effort
    absolute = base ? `${base}/${src}` : src;
  }

  return `${WAYBACK_BASE}/${timestamp}${modifier}/${absolute}`;
}
