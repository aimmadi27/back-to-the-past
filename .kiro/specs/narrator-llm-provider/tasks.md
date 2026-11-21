# Implementation Plan: Narrator LLM Provider

## Overview

Move narrator model selection into `lib/narrator/model.ts` (a provider registry plus `getNarratorModel(env, registry = PROVIDERS)`), default it to Google Gemini, keep Anthropic registered, and have `app/api/narrate/route.ts` call the resolver. Language: TypeScript (strict), Vercel AI SDK `ai` 4.3.x, Vitest. Property tests are written as table-driven Vitest cases because `fast-check` is not a dependency.

## Tasks

- [x] 1. Install the Google provider SDK and confirm its API names
  - [x] 1.1 Install `@ai-sdk/google` 1.x and confirm export and option names
    - Run `npm install @ai-sdk/google@^1` so the version pairs with `ai@^4.3.16`; confirm `package.json` lists a 1.x range and `package-lock.json` is updated
    - Open the installed `dist/index.d.ts` and confirm `createGoogleGenerativeAI` is exported and accepts `{ apiKey }`
    - Confirm the thinking-budget provider option name in the installed types (for example `thinkingConfig.thinkingBudget` under `providerOptions.google`)
    - Confirm `createGoogleGenerativeAI({ apiKey })(modelId)` is assignable to `LanguageModel` from `ai`
    - Record the confirmed factory name and option name in a short "Confirmed API names" note under Notes in this file
    - _Requirements: 5.5, 1.4, 6.2_

- [x] 2. Add configuration error types
  - [x] 2.1 Add the two error classes and mapping in `lib/errors.ts`
    - Add `NarratorNotConfiguredError(provider, envVar)` with `code = "NARRATOR_NOT_CONFIGURED"`, following the existing class pattern (`readonly code`, message built in constructor, `this.name` set)
    - Add `UnknownNarratorProviderError(provider, supported)` with `code = "UNKNOWN_NARRATOR_PROVIDER"`; truncate the echoed provider name to 50 characters in the message and list the supported names
    - Return 503 for both in `errorToStatus`
    - Add both classes to the `instanceof` union in `errorToJson` so it returns `{ error, code }`
    - Messages name the variable, never a key value
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8_

  - [x] 2.2 Add error tests to `lib/errors.test.ts`
    - `NarratorNotConfiguredError`: `code`, `name`, message contains the variable name
    - `UnknownNarratorProviderError`: `code`, `name`, message contains the value and supported names; a name longer than 50 characters is truncated in the message
    - `errorToStatus` returns 503 and `errorToJson` returns `{ error, code }` for both
    - _Requirements: 7.8, 3.6, 3.7, 3.8_

  - [ ]* 2.3 Write property-style test for config error mapping
    - **Property 7: Config errors map to 503 with a code**
    - Table-driven over varied provider names, variable names and supported lists
    - **Validates: Requirements 3.6, 3.7, 3.8**

- [x] 3. Create the model resolver
  - [x] 3.1 Create `lib/narrator/model.ts`
    - Export `Env`, `ProviderEntry`, `NarratorModel`, `DEFAULT_PROVIDER = "google"`, and `PROVIDERS` with `google` (`gemini-4-hydrogen`, `GOOGLE_GENERATIVE_AI_API_KEY`, `createGoogleGenerativeAI({ apiKey })(modelId)`) and `anthropic` (`claude-haiku-5-5`, `ANTHROPIC_API_KEY`, `createAnthropic({ apiKey })(modelId)`)
    - Export `getNarratorModel(env, registry = PROVIDERS)` returning `{ model, provider, modelId }`; use the order: trim and lowercase `NARRATOR_PROVIDER` (blank gives `google`), `Object.hasOwn` registry lookup, key check (missing, empty or whitespace throws), trimmed `NARRATOR_MODEL` or the default
    - Read nothing from `process.env` and never fall back to another provider
    - Export a named constant `NARRATOR_MAX_TOKENS` (initial value 400) with a comment that Gemini thinking tokens can count against it
    - Use the factory name confirmed in task 1.1
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.5_

  - [x] 3.2 Create `lib/narrator/model.test.ts` covering every design case
    - Defaults: empty env plus Google key gives `google` and `gemini-4-hydrogen`
    - `NARRATOR_PROVIDER=anthropic` plus Anthropic key gives `anthropic` and `claude-haiku-5-5`
    - `NARRATOR_PROVIDER=google` selects google
    - Provider name is trimmed and case-insensitive (`"  Anthropic "`); blank selects google
    - Non-empty `NARRATOR_MODEL` overrides the default for each provider; blank or whitespace uses the default
    - Missing, empty and whitespace-only key for each provider throws `NarratorNotConfiguredError` naming the variable
    - A key for the other provider does not rescue a missing key (no fallback)
    - Unknown providers (`"openai"`, `"constructor"`, `"__proto__"`, a random string) throw `UnknownNarratorProviderError` with the value and both `google` and `anthropic` in the message
    - A secret such as `"sk-SECRET-123"` never appears in any thrown message
    - A stub registry entry is selected by its name and its `create` receives `env[apiKeyEnv]` and the resolved model ID
    - A conflicting `process.env.NARRATOR_PROVIDER` does not change the result
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 1.2, 1.7, 3.5_

  - [ ]* 3.3 Write property-style tests for the resolver
    - **Property 1: Resolution returns the selected provider or throws a typed error**
    - **Property 2: Unknown provider names are rejected with the supported list**
    - **Property 3: Missing key names the variable**
    - **Property 4: Error messages never contain key values**
    - **Property 5: The API key comes from env, not process.env**
    - **Property 6: A new registry entry is selectable without other changes**
    - Table-driven over casings, whitespace and seeded random strings; one test per property, tagged `Feature: narrator-llm-provider, Property N`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 7.7, 8.1**

- [x] 4. Wire the narrator route
  - [x] 4.1 Update `app/api/narrate/route.ts`
    - Remove the `@ai-sdk/anthropic` import, the hard-coded model ID and the direct `ANTHROPIC_API_KEY` check
    - At the start of `POST`, call `getNarratorModel(process.env)` in a try/catch; for `NarratorNotConfiguredError` or `UnknownNarratorProviderError` return `JSON.stringify(errorToJson(err))` with `errorToStatus(err)` and `Content-Type: application/json`; rethrow anything else
    - Keep the order after that: rate limit (429), JSON parse (400), `narrateBodySchema` (400), `buildNarratorPrompt`, `streamText({ model: narrator.model, prompt, maxTokens: NARRATOR_MAX_TOKENS, temperature })`, `toDataStreamResponse()`
    - Keep the existing `temperature` and every other behavior unchanged; log no key values
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 8.1, 8.2_

  - [x] 4.2 Verify the provider-SDK boundary and error display
    - Run `grep -rn "@ai-sdk/" app lib components` and confirm only `lib/narrator/model.ts` (and its test, if it imports an SDK) match
    - Read `components/NarratorPanel.tsx` and confirm it shows the `error` field of a non-OK JSON response; change nothing unless it does not
    - _Requirements: 1.6, 4.6, 4.7_

- [x] 5. Update configuration and steering docs
  - [x] 5.1 Replace `.env.local.example` with the contents given in the design
    - Document `NARRATOR_PROVIDER`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `NARRATOR_MODEL`, keep `WARM_BASE_URL`
    - State that `google` is the default, give each provider's default model ID, and say only the selected provider's key is required
    - Add the note that Google's free tier may use submitted content and that only public diff data is sent
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Update `.kiro/steering/tech.md`
    - Replace the narrator stack bullet with the wording in the design (Gemini by default, swappable through the registry in `lib/narrator/model.ts`, Anthropic also registered)
    - Add the "AI narrator" bullet about `NARRATOR_PROVIDER` / `NARRATOR_MODEL` and the single-module SDK rule
    - Optionally tweak the `narrator/` comment in `.kiro/steering/structure.md`
    - _Requirements: 5.4_

- [x] 6. Checkpoint - Verify lint, tests, types and build
  - Run `npm run lint`, `npm test`, `npx tsc --noEmit` and `npm run build`; fix anything failing
  - Confirm the 114 pre-existing tests still pass alongside the new ones
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [ ] 7. Manual verification of narration completeness
  - [ ] 7.1 Run a real narration against Gemini (needs the user's real `GOOGLE_GENERATIVE_AI_API_KEY`; cannot be automated)
    - Set the key in `.env.local`, leave `NARRATOR_PROVIDER` unset, run `npm run dev` manually, trigger the narrator on 3 domains with large diffs
    - Confirm each narration is non-empty and ends on a complete sentence at the current `NARRATOR_MAX_TOKENS`
    - If truncated or empty, raise `NARRATOR_MAX_TOKENS` (for example 1024) or add the Google-only thinking-budget option under `providerOptions.google` using the name confirmed in task 1.1
    - Repeat with `NARRATOR_PROVIDER=anthropic` and an Anthropic key to confirm a complete narration
    - Record the final constant or option and the outcome in the Notes section
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Cross-reference the change in the Phase 1 spec
  - [x] 8.1 Add cross-references in `.kiro/specs/phase-1-time-travel/` docs
    - Edit only the places that say the narrator is Claude-only: add a note that FR-9.1, FR-9.3 and FR-9.4 are refined by `narrator-llm-provider` (Gemini default, provider-dependent model ID, 503 for the selected provider's key)
    - Change no other requirement, design or task content
    - _Requirements: 5.4_

  - [x] 8.2 Update the test count in the Phase 1 `tasks.md`
    - After the new tests exist, run `npm test`, read the new total, and update the stated test count in `.kiro/specs/phase-1-time-travel/tasks.md` (previous count: 114)
    - _Requirements: 8.3_

- [x] 9. Commit and push on a new branch
  - [x] 9.1 Create branch `feat/narrator-llm-provider`, commit and push
    - Run `git checkout -b feat/narrator-llm-provider`
    - Stage changed files by name (no `git add -A`), commit with a clear message, and run `git push -u origin feat/narrator-llm-provider`
    - Do not push to `main`; confirm `.env.local` is not staged
    - _Requirements: 8.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Task 7.1 needs the user's real API key and must be run manually
- `NARRATOR_MAX_TOKENS` lives in `lib/narrator/model.ts` and is imported by the route, so the token budget is tuned in one place
- Property tests are table-driven Vitest cases; adding `fast-check` is not required
- Confirmed API names (task 1.1, `@ai-sdk/google` 1.2.22): factory = `createGoogleGenerativeAI({ apiKey })`, thinking-budget option = `providerOptions.google.thinkingConfig.thinkingBudget` (number). Model IDs are typed `string`, so an invalid ID is only caught at runtime.
- Manual verification result (fill in during task 7.1): `TBD` — pending a real `GOOGLE_GENERATIVE_AI_API_KEY`. Not yet confirmed: that `gemini-4-hydrogen` is accepted by the Google API, and that the narration is not truncated at `NARRATOR_MAX_TOKENS = 400`.
- Optional tasks 2.3 and 3.3 were not written as separately tagged property tests. Their cases are covered by table-driven tests in `lib/narrator/model.test.ts` (unknown names, missing keys, no secrets in messages, `process.env` isolation, injected registry, 503 mapping).
- Added beyond the original plan (task 4.2 finding): `useCompletion` sets `error.message` to the raw response body, so the panel would have shown raw JSON. Added `lib/narrator/error-message.ts` (`extractErrorMessage`, 5 tests) and used it in `NarratorPanel.tsx` so the readable `error` text is shown (Requirement 4.7).
- Verified: the SDK-import boundary (`grep` shows only `lib/narrator/model.ts`), and a live dev-server smoke test returned HTTP 503 JSON for a missing Google key and for `NARRATOR_PROVIDER=openai`.
- Checkpoint result: lint, `tsc --noEmit`, `npm run build` clean; 148 tests pass (114 pre-existing + 34 new).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "5.2", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "4.1"] },
    { "id": 4, "tasks": ["3.3", "4.2"] },
    { "id": 5, "tasks": ["7.1", "8.2"] },
    { "id": 6, "tasks": ["9.1"] }
  ]
}
```
