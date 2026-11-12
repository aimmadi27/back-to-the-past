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
- [x] `lib/errors.test.ts` — tests for each class, `errorToStatus`, `errorToJson`

---

## 3. Domain Validation ✅

- [x] `lib/validation/domain.ts` — `validateDomain()` rejects schemes, paths, ports, IPs, localhost, single-label names; normalises to lowercase
- [x] `lib/validation/domain.test.ts` — 11 tests covering valid inputs, all rejection cases

---

## 4. Wayback CDX Client ✅

- [x] `lib/wayback/cdx.ts` — `fetchYearlySnapshots()` with 45s timeout, Next.js fetch cache (`revalidate: 3600`), and in-memory Map cache (1h TTL)
- [x] `snapshotHtmlUrl()` and `assetUrl()` helper functions
- [x] `lib/curated-examples.ts` — shared `CURATED_EXAMPLES` constant used by landing page and warm script

---

## 5. Snapshot Fetcher ✅

- [x] `lib/wayback/fetch-snapshot.ts` — `fetchSnapshotHtml()` with 15s timeout, 1-year immutable cache, typed errors for 404 and non-200

---

## 6. URL Rewriter ✅

- [x] `lib/wayback/rewrite-urls.ts` — `rewriteAssetUrls()` rewrites `<img src>`, `<link href>`, `<script src>`, `<source src>`, inline `style` background URLs to Wayback CDX modifiers
- [x] `<a href>` rewritten to Wayback `id_` URLs with `target="_blank" rel="noopener noreferrer"`
- [x] `lib/wayback/rewrite-urls.test.ts` — 5 tests covering img, CSS, data URIs, Wayback URLs (no double-wrap), absolute src

---

## 7. HTML Sanitiser ✅

- [x] `lib/sanitize/sanitize.ts` — removes `<script>`, `<noscript>`, `<iframe>`, `<frame>`, `<frameset>`, `<object>`, `<embed>`, `<applet>`, meta refresh, `<base>`; strips `on*` handlers, `javascript:`, `data:text/html`, `srcdoc`
- [x] `lib/sanitize/sanitize.test.ts` — 13 tests covering all removed elements and bypass payloads

---

## 8. Feature Extraction + Diff ✅

- [x] `lib/diff/extract-features.ts` — `extractFeatures()` returning `PageFeatures`; tech detection from concrete signals only (no body-text matching)
- [x] `lib/diff/extract-features.test.ts` — 18 tests covering each tech signal, negatives (text mentions must not trigger), Flash rules, basic field extraction
- [x] `lib/diff/diff-features.ts` — `diffFeatures()` returning `FeatureDiff` from two `PageFeatures`
- [x] `lib/diff/diff-features.test.ts` — 6 tests covering title change, Flash dying, added/removed nav links and headings, image count delta, no-change case

---

## 9. Narrator ✅

- [x] `lib/narrator/build-prompt.ts` — `buildNarratorPrompt()` builds system + user prompt from `FeatureDiff`; instructs model to describe only listed changes
- [x] `lib/narrator/build-prompt.test.ts` — 6 tests: domain/years in prompt, Flash, headings, title, no-change fallback, anti-hallucination instruction
- [x] `lib/narrator/schema.ts` — Zod `narrateBodySchema` validating `domain` + `FeatureDiff` with string caps (200 chars) and array caps (20 items)
- [x] `lib/narrator/schema.test.ts` — 8 tests: valid body, missing/invalid domain, oversized string, oversized array, missing diff, incomplete diff
- [x] `lib/narrator/rate-limit.ts` — `RateLimiter` class (exported) + `rateLimiter` singleton; 10 req/min per IP
- [x] `lib/narrator/rate-limit.test.ts` — 4 tests: allow up to max, block after max, independent IPs, window reset

---

## 10. API Route Handlers ✅

- [x] `app/api/snapshots/route.ts` — thin: validate → `fetchYearlySnapshots` → JSON; 1h CDN cache header
- [x] `app/api/snapshot/route.ts` — validate → fetch → rewrite → sanitise → HTML; CSP + `nosniff` + 1-year immutable cache
- [x] `app/api/diff/route.ts` — validate → parallel fetch → extract × 2 → diff → JSON; blocks same-timestamp; 1-year immutable cache
- [x] `app/api/narrate/route.ts` — API key check → rate limit → Zod validate → build prompt → `streamText` → data stream response

---

## 11. App Pages ✅

- [x] `app/globals.css` — Tailwind directives, CSS custom properties for pumpkin/ghost/bone/void colours, custom scrollbar
- [x] `app/layout.tsx` — root HTML, metadata, global CSS import
- [x] `app/page.tsx` — landing page with domain form (Server Action redirect), curated examples from shared constant, footer year 2026
- [x] `app/[domain]/page.tsx` — server component: validate domain → fetch snapshots → handle `NoSnapshotsError` and `ArchiveUnavailableError` with friendly UI states → render `TimeTravelView`
- [x] `app/[domain]/loading.tsx` — Suspense boundary with "reaching into the archive" message

---

## 12. Client Components ✅

- [x] `components/TimeSlider.tsx` — dual-handle slider; instant year label feedback; debounced index commit; tick buttons; compare mode toggle; hides slider for single-snapshot domains (divide-by-zero fix)
- [x] `components/SnapshotFrame.tsx` — sandboxed iframe; loading/error states; crossfade via opacity; only mounted when in the active set
- [x] `components/GhostOverlay.tsx` — debounced diff fetch (400ms); `AbortController` to discard stale responses; blocks same-timestamp compare; ghost label rendering with CSS fade animation
- [x] `components/NarratorPanel.tsx` — `useCompletion`; auto-starts on mount; cancels stream on unmount; "Tell it again" button; 503/error display

---

## 13. TimeTravelView Client Shell ✅

- [x] `app/[domain]/TimeTravelView.tsx` — manages `committedIndex` / `pendingIndex` split (debounce); `prevIndex` for crossfade; `compareIndex` with `activeDiff` cleared on compare change; `NarratorPanel` keyed by year pair; mounts only current + previous + adjacent iframes

---

## 14. Developer Tooling ✅

- [x] `eslint.config.mjs` — flat config extending `next/core-web-vitals` and `next/typescript`
- [x] `npm run lint` → `eslint .`
- [x] `scripts/warm.ts` — hits `/api/snapshots` for each curated domain; logs snapshot count per domain
- [x] `npm run warm` → `tsx scripts/warm.ts`
- [x] `tsx@4.19.4` added as dev dependency

---

## Test Summary

| File | Tests |
|---|---|
| `lib/errors.test.ts` | 13 |
| `lib/validation/domain.test.ts` | 11 |
| `lib/wayback/rewrite-urls.test.ts` | 5 |
| `lib/sanitize/sanitize.test.ts` | 13 |
| `lib/diff/extract-features.test.ts` | 18 |
| `lib/diff/diff-features.test.ts` | 6 |
| `lib/narrator/build-prompt.test.ts` | 6 |
| `lib/narrator/schema.test.ts` | 8 |
| `lib/narrator/rate-limit.test.ts` | 4 |
| **Total** | **84** |

---

## Out of Scope (Phase 2+)

The following items appear in the steering files but were explicitly deferred:

- **Graveyard** — a tombstone per feature the site ever lost, with the years it lived
- **Resurrect** — rebuild a chosen year as a working, modern, deployable page
- Route-handler-level tests (Vitest + `next-test-api-route-handler` or similar)
- Multi-instance rate limiting (Redis / Vercel KV)
- E2E tests (Playwright)
