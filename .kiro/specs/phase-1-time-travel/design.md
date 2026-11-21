# Design — Phase 1: Time Travel + Ghost Diff + Narrator

## Architecture Overview

```
Browser
  │
  ├── app/page.tsx                   Landing page (Server Component)
  │     └── LandingForm.tsx          Domain form with validation error display (Client)
  │
  └── app/[domain]/page.tsx          Domain page (Server Component)
        ├── loading.tsx              Suspense boundary
        └── TimeTravelView.tsx       Time-travel shell (Client Component)
              ├── TimeSlider.tsx     Year navigation (Client)
              ├── SnapshotFrame.tsx  Sandboxed iframe (Client)
              ├── GhostOverlay.tsx   Diff overlay (Client)
              └── NarratorPanel.tsx  Streaming AI (Client)

API Routes (Next.js Route Handlers)
  ├── /api/snapshots    GET  CDX year list
  ├── /api/snapshot     GET  Sanitised archived HTML
  ├── /api/diff         GET  Structured feature diff
  └── /api/narrate      POST Streaming LLM narration (provider set by lib/narrator/model.ts)

lib/ (Pure functions, no framework coupling)
  ├── errors.ts                 Typed error classes + serialisation
  ├── curated-examples.ts       Shared domain list (used by page.tsx + warm script)
  ├── validation/domain.ts      Hostname validation
  ├── wayback/
  │     ├── cdx.ts              CDX API client + in-memory cache
  │     ├── fetch-snapshot.ts   Raw HTML fetcher
  │     └── rewrite-urls.ts     Asset + anchor URL rewriting
  ├── sanitize/sanitize.ts      HTML sanitisation (Cheerio)
  ├── diff/
  │     ├── caps.ts             Shared MAX_STRING / MAX_ARRAY constants
  │     ├── extract-features.ts HTML → PageFeatures (truncates to caps)
  │     └── diff-features.ts    PageFeatures × 2 → FeatureDiff
  └── narrator/
        ├── build-prompt.ts     FeatureDiff → LLM prompt
        ├── schema.ts           Zod validation for /api/narrate body (imports caps)
        └── rate-limit.ts       Per-IP in-memory rate limiter
```

---

## Data Flow

### 1. Landing → Domain page

```
User types domain and submits form
  → LandingForm calls Server Action handleSearch()
      → validateDomain(raw)              [lib/validation/domain]
          → InvalidDomainError → return { error: message } → shown inline
          → valid → redirect(/<domain>)
              → DomainPage server component
                  → validateDomain(decoded)         [lib/validation/domain]
                  → fetchYearlySnapshots(domain)    [lib/wayback/cdx]
                  → <TimeTravelView snapshots={...} />
```

### 2. Snapshot rendering

```
TimeTravelView mounts committed iframe
  → SnapshotFrame renders:
      <iframe src="/api/snapshot?domain=&timestamp=&original=">
      (original = snap.original from CDX data)
      → Route handler GET /api/snapshot
          → validateDomain + validateTimestamp
          → validateOriginalUrl(original, domain)   [lib/wayback/validate-original]
          → fetchSnapshotHtml(domain, ts, original) [lib/wayback/fetch-snapshot]
          → rewriteAssetUrls(html, ts, original)    [lib/wayback/rewrite-urls]
          → sanitizeHtml()                          [lib/sanitize/sanitize]
          → Response(html, { CSP + nosniff headers })
```

### 3. Ghost diff + narration

```
User toggles compare mode
  → GhostOverlay (debounced 400ms, AbortController)
      → GET /api/diff?from=&to=&fromOriginal=&toOriginal=
          → validateOriginalUrl × 2               [lib/wayback/validate-original]
          → fetchSnapshotHtml() × 2 (parallel)
          → extractFeatures() × 2               [lib/diff/extract-features]
          → diffFeatures()                      [lib/diff/diff-features]
          → JSON FeatureDiff
      → Renders ghost labels for removed elements
      → onDiffReady(diff) → parent sets activeDiff

  → NarratorPanel (mounts with key=fromYear-toYear)
      → POST /api/narrate { diff, domain }
          → Zod validation (narrateBodySchema)
          → rate limiter check
          → buildNarratorPrompt(diff, domain)   [lib/narrator/build-prompt]
          → getNarratorModel(process.env) → streamText(...)  [Vercel AI SDK; default gemini-4-hydrogen]
          → data stream response
      → useCompletion() streams text into panel
```

---

## Key Design Decisions

### Landing form: server validation with inline errors

`handleSearch` is a Server Action that calls `validateDomain` before redirecting. `LandingForm` is a thin client component that wraps the form in `useActionState` so the server-returned `{ error }` state renders inline on the same page. This avoids a full page navigation for invalid input, keeps validation server-side, and doesn't require client-side JS to run `validateDomain`.

### Sanitisation pipeline order

HTML passes through four protection layers in sequence:
1. `rewriteAssetUrls` — rewrites img/CSS/script/anchor URLs to Wayback CDX modifiers
2. `sanitizeHtml` — strips all executable content server-side
3. CSP header (`sandbox allow-popups allow-popups-to-escape-sandbox; script-src 'none'; object-src 'none'`) — prevents execution if the response is opened directly in a tab
4. `sandbox="allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"` on the iframe — final browser-level containment

Popups are permitted (both in CSP and sandbox) so that the rewritten `<a target="_blank">` links actually open. Scripts remain blocked at all layers.

### Iframe mounting strategy

Mounting one iframe per snapshot year for a domain like apple.com would fire ~30 concurrent archive fetches on page load. Instead, `TimeTravelView` maintains a `Set<number>` of mounted indexes: current, previous (for the crossfade), and ±1 adjacent (prefetch). The slider debounce (250ms) prevents rapid scrubbing from firing intermediate requests.

### Diff input to narrator (not raw HTML)

Passing raw HTML to the LLM would be expensive, slow, and hard to ground. The structured `FeatureDiff` JSON is small (<2KB), deterministic, and contains only observable changes — which enforces the "only describe what's in the diff" constraint at the data layer, not just the prompt layer.

### Shared caps: `lib/diff/caps.ts`

`MAX_STRING = 200` and `MAX_ARRAY = 20` are defined once and imported by both `extractFeatures` (which truncates at extraction time) and `narrateBodySchema` (which validates at the API boundary). This guarantees the two layers are always in sync — if caps change, both enforcement points update together.

### Tech detection from concrete signals

Earlier implementations matched tech names anywhere in the page body, producing false positives (e.g. "We use React" text triggering a React hint). The revised approach checks only: `<script src>` and `<link href>` filename patterns, `<meta name="generator">`, `wp-content` in asset paths, and `.swf` in `<object>`/`<embed>`. This makes the narrator's tech-change claims grounded and accurate.

### In-memory caches

Two caches sit in front of the CDX API:
- **Next.js fetch cache** (`next: { revalidate: 3600 }`) — survives process restarts on Vercel
- **In-memory Map** (1h TTL) — zero-latency for requests within the same server instance

Snapshot HTML is cached with `immutable` (1 year) since Wayback content never changes at a given timestamp.

### Rate limiting

The narrator route uses a simple in-memory `RateLimiter` class (10 req/min per IP). For a single-instance hackathon deployment this is sufficient. A distributed deployment would need Redis or a Vercel KV store.

---

## Component Design

### `LandingForm`

Client component wrapping the domain input in `useActionState`. Receives the `handleSearch` Server Action as a prop so the page itself stays a Server Component. Displays inline validation errors from the server without a page navigation. Shows a pending state ("…") on the submit button while the action is in flight.

### `TimeTravelView`

State:
- `committedIndex` — index that actually triggers an iframe load
- `pendingIndex` — index shown in the year label while dragging (instant feedback)
- `prevIndex` — previous committed index, kept mounted for crossfade
- `compareIndex` — second slider position (null = compare mode off)
- `activeDiff` — latest `FeatureDiff` from `GhostOverlay`, cleared in event handlers (not effects)

Stale diff clearing is handled in `handleIndexChange` and `handleCompareIndexChange` — both event handlers — not in `useEffect`, which would cause the ESLint `react-hooks/set-state-in-effect` error. `NarratorPanel` is keyed by `${compareYear}-${currentYear}` so React re-mounts it whenever the pair changes.

### `SnapshotFrame`

Stateless relative to the parent — the parent controls which frames are mounted. `TimeTravelView` already keys each `SnapshotFrame` by `snap.timestamp`, so React unmounts and remounts the component when the timestamp changes, giving a fresh `loaded`/`error` state without a `useEffect` reset.

### `GhostOverlay`

Owns the diff-fetch lifecycle: debounce timer, `AbortController`, loading/error/result state. Calls `onDiffReady` to pass the diff upward to `TimeTravelView`, which routes it to `NarratorPanel`. Renders ghost labels as absolutely positioned `div`s with `pointer-events: none` and CSS fade animation.

### `NarratorPanel`

Uses `useCompletion` from `ai/react`. Auto-fires on mount, cancels stream on unmount via the `stop()` callback. Because the parent keys by year pair, every mount is a fresh narration.

---

## API Contract

### `GET /api/snapshots?domain=`

```json
{
  "domain": "example.com",
  "snapshots": [
    { "timestamp": "19961024065620", "year": 1996, "original": "http://www.example.com/", "statusCode": "200" }
  ]
}
```
Errors: 400 `INVALID_DOMAIN`, 404 `NO_SNAPSHOTS`, 502 `ARCHIVE_UNAVAILABLE`

### `GET /api/snapshot?domain=&timestamp=&original=`

Returns raw `text/html` with headers:
- `Content-Security-Policy: sandbox allow-popups allow-popups-to-escape-sandbox; script-src 'none'; object-src 'none'`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: public, s-maxage=31536000, immutable`

`original` is the CDX crawl URL; its hostname is validated against `domain` before use.  
Errors: 400 `INVALID_DOMAIN` / `INVALID_TIMESTAMP` / hostname-mismatch, 404 `SNAPSHOT_NOT_FOUND`, 502 `ARCHIVE_UNAVAILABLE`

### `GET /api/diff?domain=&from=&to=&fromOriginal=&toOriginal=`

Returns `FeatureDiff` JSON. `fromOriginal` and `toOriginal` are the CDX `original` URLs for each timestamp; both hostnames are validated against `domain`.  
Errors: 400 `INVALID_DOMAIN` / `INVALID_TIMESTAMP` / same-timestamp / hostname-mismatch, 404 `SNAPSHOT_NOT_FOUND`, 502 `ARCHIVE_UNAVAILABLE`

### `POST /api/narrate`

Body: `{ domain: string, diff: FeatureDiff }`  
Returns: Vercel AI SDK data stream (default model `gemini-4-hydrogen`; provider and model are configurable, see the `narrator-llm-provider` spec).  
Errors: 400 (validation), 429 (rate limit), 503 (missing API key)

---

## Security Model

| Threat | Mitigation |
|---|---|
| Archived HTML executing scripts | Sanitiser strips `<script>` + `<iframe>` + `<object>` etc.; CSP `script-src 'none'`; iframe `sandbox` (no `allow-scripts`) |
| Links in snapshots hijacking the page | Anchors rewritten to Wayback URLs + `target="_blank"`; popups allowed so tabs open; sandbox prevents navigation of parent |
| `javascript:` / `data:text/html` navigation | Sanitiser neutralises these in all URL-bearing attributes |
| Cross-origin archive requests (CORS) | All archive calls go through Next.js route handlers; browser never talks to archive directly |
| `original` URL hostname spoofing | `validateOriginalUrl` checks that the CDX `original` hostname matches the validated domain before any Wayback fetch |
| Open LLM relay / prompt injection | Zod schema caps string lengths + array sizes; domain validated before it reaches the prompt |
| Oversized strings bypassing Zod | `extractFeatures` truncates to caps at extraction time — data never arrives at the API boundary over-length |
| Credit exhaustion | Per-IP rate limiter (10 req/min) |
| Localhost / IP domain bypass | `validateDomain` explicitly rejects these before any outbound call |
| Secret leakage | API key comes from env only; never logged; never in client bundle |

---

## File Map

| Path | Purpose |
|---|---|
| `app/page.tsx` | Landing page server component: form action, curated examples |
| `app/LandingForm.tsx` | Client form with `useActionState` for inline validation errors |
| `app/layout.tsx` | Root HTML shell, global CSS |
| `app/globals.css` | Tailwind directives + CSS custom properties |
| `app/[domain]/page.tsx` | Server component: validate + fetch snapshots, error states |
| `app/[domain]/loading.tsx` | Suspense loading state |
| `app/[domain]/TimeTravelView.tsx` | Interactive client shell |
| `app/api/snapshots/route.ts` | CDX year list endpoint |
| `app/api/snapshot/route.ts` | Sanitised HTML endpoint |
| `app/api/diff/route.ts` | Feature diff endpoint |
| `app/api/narrate/route.ts` | Streaming narrator endpoint |
| `components/TimeSlider.tsx` | Year scrubber with single-snapshot guard |
| `components/SnapshotFrame.tsx` | Sandboxed iframe wrapper (allow-popups) |
| `components/GhostOverlay.tsx` | Diff overlay + ghost labels |
| `components/NarratorPanel.tsx` | Streaming AI narration panel |
| `lib/errors.ts` | Typed errors + HTTP mapping |
| `lib/curated-examples.ts` | Shared example domain list (page + warm script) |
| `lib/validation/domain.ts` | Hostname validator |
| `lib/wayback/cdx.ts` | CDX client + in-memory cache + `_clearCacheForTest` |
| `lib/wayback/fetch-snapshot.ts` | Raw HTML fetcher |
| `lib/wayback/rewrite-urls.ts` | Asset + anchor URL rewriter |
| `lib/wayback/validate-original.ts` | CDX `original` URL hostname validation |
| `lib/sanitize/sanitize.ts` | HTML sanitiser |
| `lib/diff/caps.ts` | Shared `MAX_STRING` / `MAX_ARRAY` constants |
| `lib/diff/extract-features.ts` | HTML → `PageFeatures` extractor (applies caps) |
| `lib/diff/diff-features.ts` | `PageFeatures` × 2 → `FeatureDiff` |
| `lib/narrator/build-prompt.ts` | `FeatureDiff` → LLM prompt |
| `lib/narrator/schema.ts` | Zod schema (imports caps from `lib/diff/caps.ts`) |
| `lib/narrator/rate-limit.ts` | Per-IP in-memory rate limiter (`RateLimiter` exported) |
| `scripts/warm.ts` | Demo pre-warm script (imports `CURATED_EXAMPLES`) |
| `eslint.config.mjs` | Flat ESLint config (native `eslint-config-next` v16 exports) |
| `vercel.json` | Serverless function `maxDuration: 60` for all API routes |
| `.env.local.example` | Required env var documentation |
