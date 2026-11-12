import * as cheerio from "cheerio";

/**
 * Strip all executable and embeddable content from archived HTML so it is
 * safe to serve from our origin.
 *
 * Defence-in-depth layers:
 *   1. This sanitiser (server-side, before serving)
 *   2. CSP header on /api/snapshot (script-src 'none'; object-src 'none')
 *   3. iframe sandbox attribute (browser-level, in SnapshotFrame.tsx)
 *
 * Removed entirely:
 *   - <script>, <noscript>
 *   - <iframe>, <frame>, <frameset>
 *   - <object>, <embed>, <applet>
 *   - <meta http-equiv="refresh">
 *   - <base> tags
 *
 * Stripped from every element:
 *   - Inline event handlers (on*)
 *   - javascript: in href / src / action / formaction / xlink:href / data
 *   - data:text/html in href / src / action / formaction / data (can open HTML)
 *   - srcdoc attribute (can smuggle markup into iframes we didn't remove)
 */
export function sanitizeHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove entire dangerous elements
  $("script, noscript, iframe, frame, frameset, object, embed, applet").remove();

  // Remove meta refresh
  $('meta[http-equiv="refresh"]').remove();

  // Remove base tags
  $("base").remove();

  // Per-element attribute sanitisation
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const attribs = el.attribs ?? {};

    for (const attr of Object.keys(attribs)) {
      const value = attribs[attr];

      // Strip inline event handlers
      if (/^on[a-z]/i.test(attr)) {
        $(el).removeAttr(attr);
        continue;
      }

      // Strip srcdoc (could smuggle HTML via iframes we didn't remove in future)
      if (attr.toLowerCase() === "srcdoc") {
        $(el).removeAttr(attr);
        continue;
      }

      // For URL-bearing attributes, neutralize dangerous schemes
      if (["href", "src", "action", "formaction", "data", "xlink:href"].includes(attr.toLowerCase())) {
        const trimmed = value.trim().toLowerCase();
        if (/^javascript:/i.test(trimmed)) {
          if (attr.toLowerCase() === "href") {
            $(el).attr(attr, "#");
          } else {
            $(el).removeAttr(attr);
          }
        } else if (/^data:text\/html/i.test(trimmed)) {
          // data:text/html can execute JS in some browsers
          if (attr.toLowerCase() === "href") {
            $(el).attr(attr, "#");
          } else {
            $(el).removeAttr(attr);
          }
        }
      }
    }
  });

  return $.html();
}
