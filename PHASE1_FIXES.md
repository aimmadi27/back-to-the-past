# Phase 1 Fix List

Findings from a review of the phase 1 build. Each item has the problem, where it is, and what "done" looks like. Follow the steering files; every fix to `lib/` needs Vitest tests (happy path, edge cases, failures).

## P0 — Demo blockers

### 1. CDX request times out
- **Where:** `lib/wayback/cdx.ts:33`
- **Problem:** The CDX API took ~28s for `apple.com`; the 10s timeout aborts every time, so the time-travel page always errors.
- **Done when:**
  - Timeout raised to 45s and the snapshot list for a domain is cached (in addition to fetch caching) so repeat visits are instant.
  - The `[domain]` page shows a loading state (`loading.tsx`) while the list is fetched, and a friendly "archive is slow, try again" state on `ArchiveUnavailableError` instead of the generic error boundary.
  - Curated example domains are listed in one exported constant and there is an npm script (`npm run warm`) that requests their snapshot lists so they're cached before a demo.

### 2. Every year's snapshot loads at once
- **Where:** `app/[domain]/TimeTravelView.tsx:54`, `components/SnapshotFrame.tsx`
- **Problem:** One iframe per year is mounted on page load (~30 for apple.com), firing ~30 concurrent archive fetches. `loading="lazy"` doesn't help because the frames are stacked in the viewport.
- **Done when:**
  - Only the current snapshot and the previously shown one (for the crossfade) are mounted; adjacent years may be prefetched with at most 2 extra requests.
  - Dragging the slider quickly does not fire a request for every intermediate year (debounce ~250ms before committing the year to load).

### 3. Narrator model is outdated
- **Where:** `app/api/narrate/route.ts:38`
- **Problem:** Uses `claude-3-5-haiku-20241022`, which is outdated and likely retired.
- **Done when:**
  - Model ID comes from a `NARRATOR_MODEL` env var, defaulting to `claude-haiku-5-5`.
  - `.env.local.example` documents both `ANTHROPIC_API_KEY` and `NARRATOR_MODEL`.
  - If `ANTHROPIC_API_KEY` is missing, the route returns a 503 with a clear JSON error, and the narrator panel shows it.

## P1 — Wrong results

### 4. Narration goes stale
- **Where:** `components/NarratorPanel.tsx:31-36`, `app/[domain]/TimeTravelView.tsx`
- **Problem:** The panel narrates once on mount. Changing sliders keeps the old story; toggling compare off/on narrates the old diff because `activeDiff` is never cleared.
- **Done when:**
  - `activeDiff` is cleared whenever either compare index changes or compare mode is turned off.
  - A new narration starts for each new diff (e.g. key the panel by `fromYear-toYear`), and an in-flight narration is stopped when the diff changes.

### 5. Ghost diff race condition
- **Where:** `components/GhostOverlay.tsx:34-56`
- **Problem:** Every slider change fetches `/api/diff` (2 archive fetches each) with no cancellation; a slow older response can overwrite a newer one.
- **Done when:**
  - Diff requests are debounced (~400ms) and use `AbortController`; aborted requests never update state.
  - Comparing a year with itself is prevented (UI disallows it, and the API returns 400).

### 6. Narrator can describe changes that didn't happen
- **Where:** `lib/diff/extract-features.ts:65-78`
- **Problem:** Tech detection regex-matches words like "react"/"angular" anywhere in the body HTML, producing false "technology changes". `<object>`/`<embed>` are labelled Flash while `hasFlash` uses different rules.
- **Done when:**
  - Tech hints are detected from concrete signals only: `<script src>` / `<link href>` filenames (e.g. `jquery*.js`, `bootstrap*.css`), `<meta name="generator">`, `wp-content` paths, `.swf` in `<object>`/`<embed>`.
  - Flash detection uses one rule shared by `techHints` and `hasFlash`.
  - `extract-features.test.ts` covers each signal plus negatives (page text mentioning "react" must NOT produce a React hint).

## P1 — Security

### 7. Sanitizer bypasses + top-level snapshot exposure
- **Where:** `lib/sanitize/sanitize.ts`, `app/api/snapshot/route.ts`
- **Problem:** These survive sanitization (verified): `<iframe srcdoc="<script>…">`, `<object data="data:text/html,…">`, `<button formaction="javascript:…">`. Inside the sandboxed iframe they can't run, but `/api/snapshot` can be opened directly in a tab, where they would execute on our origin.
- **Done when:**
  - `/api/snapshot` responses include `Content-Security-Policy: sandbox; script-src 'none'; object-src 'none'` and `X-Content-Type-Options: nosniff`.
  - Sanitizer removes `iframe`, `frame`, `object`, `embed`, `applet`, strips `srcdoc`, and neutralizes `javascript:`/`data:text/html` in `href`, `src`, `action`, `formaction`, `xlink:href`, `data`.
  - Tests cover each payload above.

### 8. `/api/narrate` is an open LLM relay
- **Where:** `app/api/narrate/route.ts:15-35`
- **Problem:** Accepts any body unvalidated, so anyone can spend our Anthropic credits or inject arbitrary text into the prompt.
- **Done when:**
  - Body is validated with a schema (zod): `domain` passes `validateDomain`, `diff` matches `FeatureDiff`, string fields capped (e.g. 200 chars), arrays capped (e.g. 20 items). Invalid → 400.
  - Simple per-IP rate limit (e.g. 10 requests/minute, in-memory is fine for the hackathon) → 429 when exceeded.
  - Tests cover valid, malformed, oversized and rate-limited requests.

## P2 — Hackathon readiness & cleanup

### 9. Missing tests
- Add Vitest tests for `extract-features`, `cdx` (mock `fetch`: success, empty, non-200, malformed JSON, timeout), `fetch-snapshot` (200, 404, 5xx, timeout), `build-prompt`, `errors`, and the four route handlers.

### 10. Lint
- Add `eslint.config.mjs` (flat config, Next.js rules) and change the `lint` script to `eslint .`. Fix any errors it reports.

### 11. Small bugs
- Footer says "Kiroween 2024" → "Kiroween 2026" (`app/page.tsx:89`).
- Timestamp validation errors reuse `InvalidDomainError` → add `InvalidTimestampError` (400) (`app/api/diff/route.ts:22-27`, `app/api/snapshot/route.ts:21-23`).
- Slider divides by zero when there's one snapshot (`components/TimeSlider.tsx:76`) → handle 1 snapshot (hide slider, show the single year).
- Links inside snapshots navigate the iframe away (relative links load our own app inside the frame) → rewrite `<a href>` to the matching Wayback URL with `target="_blank" rel="noopener noreferrer"`.
- Snapshot and diff routes use `https://<domain>/` instead of the CDX `original` URL → pass the `original` from the snapshot list through to these routes (validate that its hostname matches the domain).
