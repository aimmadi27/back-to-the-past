import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const html = `<html><body><script>alert('xss')</script><p>Hello</p></body></html>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Hello</p>");
  });

  it("removes noscript tags", () => {
    const html = `<noscript><p>Enable JS</p></noscript>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("noscript");
  });

  it("removes iframe tags (including srcdoc bypass)", () => {
    const html = `<iframe srcdoc="<script>alert(1)</script>">fallback</iframe>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("srcdoc");
  });

  it("removes object tags", () => {
    const html = `<object data="data:text/html,<script>evil()</script>"></object>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<object");
  });

  it("removes embed tags", () => {
    const html = `<embed src="flash.swf">`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<embed");
  });

  it("removes applet tags", () => {
    const html = `<applet code="bad.class"></applet>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<applet");
  });

  it("removes inline event handlers", () => {
    const html = `<a href="#" onclick="evil()" onmouseover="bad()">Click</a>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
  });

  it("strips javascript: hrefs", () => {
    const html = `<a href="javascript:void(0)">Click</a>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="#"');
  });

  it("strips data:text/html hrefs", () => {
    const html = `<a href="data:text/html,<script>alert(1)</script>">Click</a>`;
    const result = sanitizeHtml(html);
    expect(result).toContain('href="#"');
    expect(result).not.toContain("data:text/html");
  });

  it("strips formaction javascript:", () => {
    const html = `<button formaction="javascript:alert(1)">Go</button>`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("formaction");
  });

  it("removes meta refresh", () => {
    const html = `<meta http-equiv="refresh" content="0; url=https://evil.com">`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("refresh");
  });

  it("removes base tags", () => {
    const html = `<base href="https://evil.com/">`;
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<base");
  });

  it("preserves normal content", () => {
    const html = `<p class="text">Normal <strong>content</strong></p>`;
    const result = sanitizeHtml(html);
    expect(result).toContain("<p");
    expect(result).toContain("<strong>content</strong>");
  });
});
