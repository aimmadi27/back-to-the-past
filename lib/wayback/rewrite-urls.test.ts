import { describe, it, expect } from "vitest";
import { rewriteAssetUrls } from "./rewrite-urls";

const TS = "20090815120000";
const BASE = "https://example.com";

describe("rewriteAssetUrls", () => {
  it("rewrites img src to im_ modifier", () => {
    const html = `<img src="/logo.png">`;
    const result = rewriteAssetUrls(html, TS, BASE);
    expect(result).toContain(`https://web.archive.org/web/${TS}im_/${BASE}/logo.png`);
  });

  it("rewrites stylesheet href to cs_ modifier", () => {
    const html = `<link rel="stylesheet" href="/style.css">`;
    const result = rewriteAssetUrls(html, TS, BASE);
    expect(result).toContain(`https://web.archive.org/web/${TS}cs_/${BASE}/style.css`);
  });

  it("leaves data URIs alone", () => {
    const html = `<img src="data:image/png;base64,abc">`;
    const result = rewriteAssetUrls(html, TS, BASE);
    expect(result).toContain("data:image/png;base64,abc");
  });

  it("leaves already-rewritten Wayback URLs alone", () => {
    const waybackSrc = `https://web.archive.org/web/${TS}im_/https://example.com/logo.png`;
    const html = `<img src="${waybackSrc}">`;
    const result = rewriteAssetUrls(html, TS, BASE);
    expect(result).toContain(waybackSrc);
    // Should not double-wrap
    expect(result).not.toContain("web.archive.org/web/20090815120000im_/https://web.archive.org");
  });

  it("rewrites absolute https src", () => {
    const html = `<img src="https://cdn.example.com/img.jpg">`;
    const result = rewriteAssetUrls(html, TS, BASE);
    expect(result).toContain(`https://web.archive.org/web/${TS}im_/https://cdn.example.com/img.jpg`);
  });
});
