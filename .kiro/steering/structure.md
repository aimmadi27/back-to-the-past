---
inclusion: always
---

# Back to the Past — Structure & Conventions

## Layout

```
app/
  page.tsx                    # landing: domain input + curated examples
  [domain]/page.tsx           # time-travel view
  api/
    snapshots/route.ts        # GET ?domain= → yearly snapshot list
    snapshot/route.ts         # GET ?domain=&timestamp= → sanitized, asset-rewritten HTML
    diff/route.ts             # GET ?domain=&from=&to= → structured diff JSON
    narrate/route.ts          # POST { diff } → streamed narrative
lib/
  wayback/                    # CDX client, snapshot fetch, URL rewriting
  sanitize/                   # script/handler stripping
  diff/                       # HTML → feature extraction, feature diffing
  narrator/                   # prompt building, model/provider registry
  validation/                 # domain validation
components/
  TimeSlider.tsx
  SnapshotFrame.tsx           # sandboxed iframe + crossfade
  GhostOverlay.tsx
  NarratorPanel.tsx
```

## Conventions

- Business logic lives in `lib/` as pure, testable functions; route handlers stay thin (validate → call lib → respond).
- Every `lib/` function has Vitest tests covering the happy path, edge cases, and failure cases, colocated as `*.test.ts`.
- Use typed error classes (e.g. `ArchiveUnavailableError`, `NoSnapshotsError`, `InvalidDomainError`) and map them to HTTP status codes in one place.
- No silent fallbacks: if a snapshot can't be rendered, return an explicit error state the UI can show.
- Comments only where the "why" is non-obvious.
