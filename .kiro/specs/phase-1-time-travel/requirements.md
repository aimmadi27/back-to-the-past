# Requirements — Phase 1: Time Travel + Ghost Diff + Narrator

## Overview

Back to the Past is a Kiroween hackathon entry in the "Resurrection" category. Users enter a domain name and travel through its archived history via the Internet Archive Wayback Machine. Every year the archive captured comes back to life in a sandboxed iframe. When comparing two years, removed elements appear as floating "ghost" overlays and an AI narrator streams a short spooky story of what changed.

---

## Functional Requirements

### FR-1 Landing Page

**FR-1.1** The root route `/` renders a domain input form with a text field and a "Travel" submit button.  
**FR-1.2** On submit, the domain is validated server-side via `validateDomain`. If invalid, an error message is shown inline on the form (using `useActionState`). If valid, the user is redirected to `/<domain>` (URL-encoded).  
**FR-1.3** A curated set of example domains is shown as quick-links below the form. Clicking one navigates to that domain's time-travel view.  
**FR-1.4** The landing page has a Halloween-themed visual style (dark background, pumpkin/ghost color palette).

### FR-2 Domain Validation

**FR-2.1** Domain input is validated server-side before any archive call is made.  
**FR-2.2** Valid input is a plain hostname only (e.g. `example.com`, `sub.example.co.uk`).  
**FR-2.3** The following are rejected with a clear error: schemes (`https://`), paths, ports, IP addresses, `localhost`, single-label names.  
**FR-2.4** Input is normalised to lowercase with leading/trailing whitespace stripped.

### FR-3 Snapshot Listing

**FR-3.1** The `/api/snapshots?domain=` endpoint fetches one snapshot per year from the CDX API (`collapse=timestamp:4`).  
**FR-3.2** Results are sorted ascending by timestamp.  
**FR-3.3** Snapshot data includes: `timestamp` (14-digit), `year` (integer), `original` URL, and `statusCode`.  
**FR-3.4** If the CDX API returns no rows the route returns a 404 with `NoSnapshotsError`.  
**FR-3.5** CDX results are cached (Next.js fetch cache + in-memory Map with 1 h TTL) so repeat visits within the same server instance are instant without hitting the archive again.  
**FR-3.6** The CDX timeout is 45 seconds to handle slow responses for popular domains.

### FR-4 Time-Travel View

**FR-4.1** Navigating to `/<domain>` fetches the snapshot list server-side and renders a `TimeTravelView` client component.  
**FR-4.2** A `loading.tsx` Suspense boundary shows a loading state while the CDX fetch is in progress.  
**FR-4.3** If the archive is unavailable (`ArchiveUnavailableError`) the page shows a friendly "archive is slow, try again" state rather than a generic error boundary.  
**FR-4.4** The view has a sticky top bar showing the domain name and the currently selected year.  
**FR-4.5** All `<a>` elements that navigate to app-internal paths use `<Link>` from `next/link`.

### FR-5 Time Slider

**FR-5.1** A slider component lets users drag across snapshot years. Each year in the archive has a corresponding tick button.  
**FR-5.2** The slider position is debounced 250 ms before committing a year load, so dragging quickly does not fire a request per year.  
**FR-5.3** Year label feedback is instant (before the debounce fires) so the user sees the year update while dragging.  
**FR-5.4** When only one snapshot exists, the slider is hidden and the single year is shown as a label.  
**FR-5.5** A "Compare years" toggle activates a second slider handle that picks the "from" year for the ghost diff.

### FR-6 Snapshot Rendering

**FR-6.1** The `/api/snapshot?domain=&timestamp=` endpoint fetches the raw archived HTML using the Wayback `id_` modifier (no toolbar).  
**FR-6.2** Asset URLs (images, CSS, scripts) are rewritten to Wayback `im_`, `cs_`, and `if_` modifiers so they load correctly.  
**FR-6.3** Anchor links are rewritten to Wayback `id_` URLs and given `target="_blank" rel="noopener noreferrer"` so they open in new tabs rather than navigating the iframe.  
**FR-6.4** The HTML is sanitised (see FR-7) before being served.  
**FR-6.5** Snapshots are served with `Cache-Control: immutable` (1 year) since archived content never changes.  
**FR-6.6** Only the current, previous, and two adjacent snapshots are mounted as iframes at any time — never all years at once.  
**FR-6.7** The snapshot frame crossfades when switching years (opacity transition 500 ms).  
**FR-6.8** If a snapshot cannot be loaded, the frame shows a tombstone error state rather than a blank iframe.

### FR-7 HTML Sanitisation

**FR-7.1** The following elements are removed entirely: `<script>`, `<noscript>`, `<iframe>`, `<frame>`, `<frameset>`, `<object>`, `<embed>`, `<applet>`.  
**FR-7.2** `<meta http-equiv="refresh">` and `<base>` tags are removed.  
**FR-7.3** All inline event handlers (`on*` attributes) are stripped from every element.  
**FR-7.4** `javascript:` values in `href`, `src`, `action`, `formaction`, `data`, and `xlink:href` are neutralised (`href` → `#`, others removed).  
**FR-7.5** `data:text/html` values in URL-bearing attributes are neutralised the same way.  
**FR-7.6** The `srcdoc` attribute is stripped.  
**FR-7.7** The snapshot route sends `Content-Security-Policy: sandbox allow-popups allow-popups-to-escape-sandbox; script-src 'none'; object-src 'none'` and `X-Content-Type-Options: nosniff` as a second layer of defence.  
**FR-7.8** The iframe in `SnapshotFrame` has `sandbox="allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"` as a third layer. Scripts remain blocked.

### FR-8 Ghost Diff

**FR-8.1** The `/api/diff?domain=&from=&to=` endpoint fetches both snapshots, extracts structured features from each, and returns a typed `FeatureDiff` JSON object.  
**FR-8.2** Features extracted include: title, h1-h3 headings, nav/header links, paragraph copy, image alt texts, inline CSS colours, tech stack hints, meta description, Flash presence, iframe presence, link count, image count.  
**FR-8.3** Tech stack detection uses only concrete signals: `<script src>` filename patterns, `<link href>` filename patterns, `<meta name="generator">`, `wp-content` paths in src/href attributes, and `.swf` in `<object>`/`<embed>`. It never matches free text in the page body.  
**FR-8.4** Flash detection uses one shared rule for both `hasFlash` and the `techHints` array.  
**FR-8.5** The diff endpoint returns 400 if `from === to` (comparing a snapshot to itself is meaningless).  
**FR-8.6** `GhostOverlay` debounces diff requests 400 ms and uses `AbortController` so a slow stale response can never overwrite a newer one.  
**FR-8.7** Removed headings, nav links, and tech hints are displayed as floating ghost labels over the snapshot frame, fading in and out.

### FR-9 AI Narrator

**FR-9.1** The `/api/narrate` endpoint accepts `{ diff: FeatureDiff, domain: string }` and streams a Claude response via the Vercel AI SDK.  
**FR-9.2** The narrator prompt is built from the structured diff only — it instructs the model to describe only changes present in the diff and not to invent content.  
**FR-9.3** The model ID is read from the `NARRATOR_MODEL` environment variable, defaulting to `claude-haiku-5-5`.  
**FR-9.4** If `ANTHROPIC_API_KEY` is not set, the route returns 503 with a clear JSON error message.  
**FR-9.5** The request body is validated with a Zod schema: `domain` passes `validateDomain`, all string fields are capped at 200 chars, all arrays at 20 items. Invalid bodies return 400.  
**FR-9.6** A per-IP in-memory rate limiter (10 requests/minute) returns 429 when exceeded.  
**FR-9.7** `NarratorPanel` auto-starts narration on mount and cancels any in-flight stream on unmount.  
**FR-9.8** The panel is keyed by `fromYear-toYear` in the parent so it re-mounts (and re-narrates) for every new diff. No stale narration is shown.

### FR-10 Error Handling

**FR-10.1** The codebase uses typed error classes: `InvalidDomainError`, `InvalidTimestampError`, `NoSnapshotsError`, `ArchiveUnavailableError`, `SnapshotNotFoundError`.  
**FR-10.2** Each class carries a `code` string and maps to an HTTP status via `errorToStatus()`.  
**FR-10.3** `errorToJson()` serialises errors safely for API responses without leaking internal details.  
**FR-10.4** There are no silent fallbacks: every error state is surfaced explicitly to the UI.

### FR-11 Schema / Caps Consistency

**FR-11.1** A shared `lib/diff/caps.ts` module exports `MAX_STRING = 200` and `MAX_ARRAY = 20`.  
**FR-11.2** `extractFeatures` truncates all string fields to `MAX_STRING` and all arrays to `MAX_ARRAY` at extraction time.  
**FR-11.3** `narrateBodySchema` imports and applies the same constants, ensuring `extractFeatures` output always passes schema validation without further truncation.

### FR-12 Developer Tooling

**FR-12.1** `npm run dev` starts the Next.js development server.  
**FR-12.2** `npm run build` produces a production build.  
**FR-12.3** `npm run test` runs the Vitest suite once.  
**FR-12.4** `npm run lint` runs ESLint using the flat config (`eslint-config-next` v16 native flat exports — no `FlatCompat`).  
**FR-12.5** `npm run warm` hits `/api/snapshots` for each domain in `CURATED_EXAMPLES` so responses are cached before a demo. The script imports from `lib/curated-examples.ts` — no duplicate list.

---

## Non-Functional Requirements

**NFR-1 Performance** — The demo must reach first paint in under 2 minutes. Snapshot responses are cached with `immutable` headers. CDX results are cached for 1 hour. Only current ± adjacent iframes are mounted.

**NFR-2 Security** — Archived HTML is untrusted. It is sanitised server-side and rendered in a sandboxed iframe with no scripts allowed (but popups enabled so rewritten links open correctly). All archive calls go through Next.js route handlers; no archive requests are made from the client. Domain input is validated server-side before any outbound call.

**NFR-3 Reliability** — Snapshots being broken (missing CSS/images) is expected and handled gracefully. Missing snapshots show a tombstone state, not a blank iframe.

**NFR-4 Accuracy** — The narrator only describes changes present in the computed diff. The archive is the source of truth; no content is invented.

**NFR-5 Accessibility** — Interactive elements have `aria-label` or `aria-pressed` attributes. Loading and live regions use `aria-live`. Screen-reader-only labels are provided for the domain input. Validation errors render as visible `role="alert"` text, not just colour.

**NFR-6 Maintainability** — Business logic lives in `lib/` as pure, testable functions. Route handlers stay thin (validate → call lib → respond). Every `lib/` module has colocated Vitest tests covering happy paths, edge cases, and failure cases.
