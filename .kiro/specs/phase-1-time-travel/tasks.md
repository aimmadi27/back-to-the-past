# Tasks — Phase 1: Time Travel + Ghost Diff + Narrator

All tasks in this spec are **completed**. This file documents what was built and can be used as a reference for Phase 2 planning or for auditing the implementation against requirements.

---

## 1. Project Bootstrap ✅

- [x] Scaffold `package.json` with Next.js 16, React 19, TypeScript strict, Tailwind CSS, Vitest, Cheerio, Vercel AI SDK, `@ai-sdk/anthropic`, Zod
- [x] Create `tsconfig.json` (App Router, strict, path alias `@/*`)
- [x] Create `tailwind.config.ts` with custom colors (`pumpkin`, `ghost`, `bone`) and keyframe animations (`fade-ghost`, `crossfade-in`)
- [x] Create `postcss.config.mjs`, `next.config.ts`, `vitest.config.ts`
- [x] Create `.env.local.example` documenting `ANTHROPIC_API_KEY` and `NARRATOR_MODEL`
- [x] Create `.gitignore`
- [x] Install `zod@3.25.75` (required by `zod-to-json-schema` nested dep in AI SDK)

---

## 2. Typed Errors ✅

- [x] `lib/errors.ts` — `InvalidDomainError`, `InvalidTimestampError`, `NoSnapshotsError`, `ArchiveUnavailableError`, `SnapshotNotFoundError`
- [x] `errorToStatus()` — maps each class to an HTTP status code
- [x] `errorToJson()` — safe serialisation for API responses
- [x] `lib/errors.test.ts` — 13 tests for each class, `errorToStatus`, `errorToJson`

---

## 3. Domain Validation ✅

- [x] `lib/validation/domain.ts` — `validateDomain()` rejects schemes, paths, ports, IPs, localhost, single-label names; normalises to lowercase
- [x] `lib/validation/domain.test.ts` — 11 tests covering valid inputs, all rejection cases

---

## 4. Wayback CDX Client ✅

- [x] `lib/wayback/cdx.ts` — `fetchYearlySnapshots()` with 45s timeout, Next.js fetch cache (`revalidate: 3600`), and in-memory Map cache (1h TTL)
- [x] `_clearCacheForTest()` exported for test isolation
- [x] `snapshotHtmlUrl()` and `assetUrl()` helper functions
- [x] `lib/wayback/cdx.test.ts` — 8 tests: success (sorted + years parsed), header-only → `NoSnapshotsError`, empty array → `NoSnapshotsError`, non-200 → `ArchiveUnavailableError`, malformed JSON → `ArchiveUnavailableError`, network error → `ArchiveUnavailableError`, cache hit (fetch called once for two calls)
- [x] `lib/curated-examples.ts` — shared `CURATED_EXAMPLES` constant used by landing page and warm script

---

## 5. Snapshot Fetcher ✅

- [x] `lib/wayback/fetch-snapshot.ts` — `fetchSnapshotHtml()` with 15s timeout, 1-year immutable cache, typed errors for 404 and non-200
- [x] `lib/wayback/fetch-snapshot.test.ts` — 6 tests: 200 returns HTML, 404 → `SnapshotNotFoundError`, 5xx → `ArchiveUnavailableError`, network error → `ArchiveUnavailableError`, AbortError → `ArchiveUnavailableError`, error message includes domain

---

## 6. URL Rewriter ✅

- [x] `lib/wayback/rewrite-urls.ts` — `rewriteAssetUrls()` rewrites `<img src>`, `<link href>`, `<script src>`, `<source src>`, inline `style` background URLs to Wayback CDX modifiers; `<a href>` rewritten to Wayback `id_` URLs with `target="_blank" rel="noopener noreferrer"`
- [x] `lib/wayback/rewrite-urls.test.ts` — 5 tests covering img, CSS, data URIs, Wayback URLs (no double-wrap), absolute src

---

## 7. HTML Sanitiser ✅

- [x] `lib/sanitize/sanitize.ts` — removes `<script>`, `<noscript>`, `<iframe>`, `<frame>`, `<frameset>`, `<object>`, `<embed>`, `<applet>`, meta refresh, `<base>`; strips `on*` handlers, `javascript:`, `data:text/html`, `srcdoc`
- [x] `lib/sanitize/sanitize.test.ts` — 13 tests covering all removed elements and bypass payloads

---

## 8. Original URL Validation ✅

- [x] `lib/wayback/validate-original.ts` — `validateOriginalUrl(original, validDomain)` accepts only HTTP/HTTPS URLs whose hostname matches the validated domain (exact, `www.` prefix, or subdomain); throws `InvalidDomainError` otherwise
- [x] `lib/wayback/validate-original.test.ts` — 10 tests: exact match, https, www prefix, subdomain, empty, non-URL, javascript: scheme, wrong domain, path-segment trick, data: URI

---

## 9. Shared Caps Module ✅

- [x] `lib/diff/caps.ts` — exports `MAX_STRING = 200` and `MAX_ARRAY = 20`
- [x] `extractFeatures` imports caps and truncates all strings/arrays at extraction time
- [x] `narrateBodySchema` imports caps from `lib/diff/caps.ts` (not hardcoded)

---

## 10. Feature Extraction + Diff ✅

- [x] `lib/diff/extract-features.ts` — `extractFeatures()` returning `PageFeatures`; tech detection from concrete signals only; all strings truncated to `MAX_STRING`, arrays to `MAX_ARRAY`
- [x] `lib/diff/extract-features.test.ts` — 24 tests: each tech signal, negatives, Flash rules, basic field extraction, truncation to `MAX_STRING`, array cap, end-to-end schema compatibility test
- [x] `lib/diff/diff-features.ts` — `diffFeatures()` returning `FeatureDiff` from two `PageFeatures`
- [x] `lib/diff/diff-features.test.ts` — 6 tests covering title change, Flash dying, added/removed nav links and headings, image count delta, no-change case

---

## 11. Narrator ✅

- [x] `lib/narrator/build-prompt.ts` — `buildNarratorPrompt()` builds system + user prompt from `FeatureDiff`; instructs model to describe only listed changes
- [x] `lib/narrator/build-prompt.test.ts` — 6 tests: domain/years in prompt, Flash, headings, title, no-change fallback, anti-hallucination instruction
- [x] `lib/narrator/schema.ts` — Zod `narrateBodySchema` importing caps from `lib/diff/caps.ts`
- [x] `lib/narrator/schema.test.ts` — 8 tests: valid body, missing/invalid domain, oversized string, oversized array, missing diff, incomplete diff
- [x] `lib/narrator/rate-limit.ts` — `RateLimiter` class (exported for testing) + `rateLimiter` singleton; 10 req/min per IP
- [x] `lib/narrator/rate-limit.test.ts` — 4 tests: allow up to max, block after max, independent IPs, window reset

---

## 12. API Route Handlers ✅

- [x] `app/api/snapshots/route.ts` — thin: validate → `fetchYearlySnapshots` → JSON; 1h CDN cache header
- [x] `app/api/snapshot/route.ts` — accepts `original` param; validates hostname via `validateOriginalUrl`; fetch → rewrite → sanitise → HTML; CSP + `nosniff` + 1-year immutable cache
- [x] `app/api/diff/route.ts` — accepts `fromOriginal` + `toOriginal`; validates both via `validateOriginalUrl`; parallel fetch → extract × 2 → diff → JSON; blocks same-timestamp; 1-year immutable cache
- [x] `app/api/narrate/route.ts` — API key check → rate limit → Zod validate → build prompt → `streamText` (model from `NARRATOR_MODEL` env, default `claude-haiku-5-5`) → data stream response

---

## 13. App Pages ✅

- [x] `app/globals.css` — Tailwind directives, CSS custom properties for pumpkin/ghost/bone/void colours, custom scrollbar
- [x] `app/layout.tsx` — root HTML, metadata, global CSS import
- [x] `app/page.tsx` — landing page server component; `handleSearch` Server Action calls `validateDomain` and returns `{ error }` on failure; uses `CURATED_EXAMPLES` from shared constant; footer year 2026
- [x] `app/LandingForm.tsx` — client form component using `useActionState` to display inline validation errors from `handleSearch`
- [x] `app/[domain]/page.tsx` — server component: validate domain → fetch snapshots → handle `NoSnapshotsError` and `ArchiveUnavailableError` with friendly UI states → all navigation uses `<Link>` not `<a>`
- [x] `app/[domain]/loading.tsx` — Suspense boundary with "reaching into the archive" message

---

## 14. Client Components ✅

- [x] `components/TimeSlider.tsx` — dual-handle slider; instant year label feedback; debounced index commit; tick buttons; compare mode toggle; single-snapshot guard; compare slider and tick buttons skip the current year index (no same-year comparison via UI)
- [x] `components/SnapshotFrame.tsx` — accepts `original` prop; passes it to `/api/snapshot`; sandboxed iframe with `allow-popups allow-popups-to-escape-sandbox`; loading/error states; crossfade; state reset by React key
- [x] `components/GhostOverlay.tsx` — accepts `fromOriginal` + `toOriginal`; passes them to `/api/diff`; debounced 400ms; `AbortController`; blocks same-timestamp; ghost label animation
- [x] `components/NarratorPanel.tsx` — `useCompletion`; auto-starts on mount; cancels stream on unmount; "Tell it again" button; 503/error display

---

## 15. TimeTravelView Client Shell ✅

- [x] `app/[domain]/TimeTravelView.tsx` — passes `snap.original` to `SnapshotFrame` and `GhostOverlay`; debounce cleanup `useEffect` on unmount; stale diff cleared in event handlers; `NarratorPanel` keyed by year pair; mounts only current + previous + adjacent iframes

---

## 16. Developer Tooling & Deployment ✅

- [x] `eslint.config.mjs` — flat config using native `eslint-config-next` v16 exports; no `FlatCompat`; zero errors/warnings
- [x] `vercel.json` — `maxDuration: 60` on all four API routes (prevents 10s default timeout for slow Wayback responses)
- [x] `scripts/warm.ts` — imports `CURATED_EXAMPLES` from `lib/curated-examples.ts`; hits `/api/snapshots` for each domain
- [x] `npm run warm` → `tsx scripts/warm.ts`

---

## Test Summary

| File | Tests |
|---|---|
| `lib/errors.test.ts` | 13 |
| `lib/validation/domain.test.ts` | 11 |
| `lib/wayback/cdx.test.ts` | 8 |
| `lib/wayback/fetch-snapshot.test.ts` | 6 |
| `lib/wayback/rewrite-urls.test.ts` | 5 |
| `lib/wayback/validate-original.test.ts` | 10 |
| `lib/sanitize/sanitize.test.ts` | 13 |
| `lib/diff/extract-features.test.ts` | 24 |
| `lib/diff/diff-features.test.ts` | 6 |
| `lib/narrator/build-prompt.test.ts` | 6 |
| `lib/narrator/schema.test.ts` | 8 |
| `lib/narrator/rate-limit.test.ts` | 4 |
| **Total** | **114** |

---

## Out of Scope (Phase 2+)

The following items appear in the steering files but were explicitly deferred:

- **Graveyard** — a tombstone per feature the site ever lost, with the years it lived
- **Resurrect** — rebuild a chosen year as a working, modern, deployable page
- Route-handler-level tests (Vitest + `next-test-api-route-handler` or similar)
- Multi-instance rate limiting (Redis / Vercel KV)
- E2E tests (Playwright)
