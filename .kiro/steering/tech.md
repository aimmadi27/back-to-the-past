---
inclusion: always
---

# Back to the Past — Tech

## Stack

- Next.js (App Router) + TypeScript (strict), deployed on Vercel
- Tailwind CSS for styling
- `cheerio` for server-side HTML parsing and rewriting
- Vercel AI SDK for the narrator, streaming from a Claude model; API key from environment variables only
- Vitest for unit tests

## Internet Archive

- Snapshot listing: CDX API — `https://web.archive.org/cdx/search/cdx?url=<domain>&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&collapse=timestamp:4` (`collapse=timestamp:4` = one capture per year).
- Raw snapshot HTML: `https://web.archive.org/web/<timestamp>id_/<url>` (`id_` returns the original page without the Wayback toolbar).
- Assets: rewrite relative/absolute asset URLs to `https://web.archive.org/web/<timestamp>im_/` (images) or `cs_/` (CSS) so they resolve against the archive.
- The archive blocks browser CORS and rate-limits. All archive calls go through Next.js route handlers, never from the client.
- Snapshots are immutable — cache responses aggressively (keyed by domain + timestamp).
- Handle timeouts, non-200s, and empty CDX results explicitly with typed errors surfaced to the UI.

## Security

- Archived HTML is untrusted. Render it in an `<iframe srcdoc>` with `sandbox` and WITHOUT `allow-scripts`; strip `<script>` tags and inline event handlers server-side.
- Validate the domain input server-side (hostname only, no schemes/paths/IPs/localhost) before calling the archive.
- Never log user input beyond the domain; never log API keys.

## AI narrator

- One streaming LLM call per comparison — no agents.
- Input is the structured diff (JSON), not raw HTML, to keep prompts small and grounded.
- The prompt must instruct the model to only describe changes present in the diff.
