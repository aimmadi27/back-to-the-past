# Requirements Document

## Introduction

The AI narrator currently streams from Anthropic Claude, which requires a paid API key. This feature runs the narrator on Google's free Gemini model by default and makes the LLM provider selectable through configuration. A provider registry in a single module lets a new provider (for example OpenAI) be added with one table entry and its SDK package, without changing the route. Anthropic stays wired up so the project can switch back after testing.

This feature refines these Phase 1 requirements in `.kiro/specs/phase-1-time-travel/requirements.md`:

- FR-9.1 (streams a Claude response): the narrator streams from the configured provider, Google Gemini by default.
- FR-9.3 (model ID default `claude-haiku-5-5`): the default model ID depends on the selected provider.
- FR-9.4 (503 when `ANTHROPIC_API_KEY` is not set): the 503 applies to the API key of the selected provider.

It also updates the steering file `.kiro/steering/tech.md`, which currently says the narrator streams from a Claude model.

The following stay unchanged: `lib/narrator/build-prompt.ts`, `lib/narrator/schema.ts`, `lib/narrator/rate-limit.ts`, `components/NarratorPanel.tsx`, the request check order, and the streaming response format.

## Glossary

- **Narrator_Route**: The route handler at `app/api/narrate/route.ts` that accepts `POST { diff, domain }` and streams the narration.
- **Model_Resolver**: The module `lib/narrator/model.ts` that exports `getNarratorModel(env)`.
- **Provider_Registry**: The single lookup table in the Model_Resolver that maps a provider name to a factory, a default model ID, and the name of the required API-key environment variable.
- **Provider**: A named LLM vendor entry in the Provider_Registry. Supported values are `google` and `anthropic`.
- **Narrator_Model**: The AI SDK `LanguageModel` instance returned by `getNarratorModel`.
- **Env**: A plain object of environment variable names to string values, passed to `getNarratorModel` as a parameter.
- **Default_Google_Model**: The model ID `gemini-4-hydrogen`.
- **Default_Anthropic_Model**: The model ID `claude-haiku-5-5`.
- **NarratorNotConfiguredError**: A typed error in `lib/errors.ts` raised when the selected Provider has no API key configured.
- **UnknownNarratorProviderError**: A typed error in `lib/errors.ts` raised when `NARRATOR_PROVIDER` names a provider that is not in the Provider_Registry.
- **Token_Limit**: The maximum number of output tokens the Narrator_Route requests from the model.
- **Narrator_Panel**: The client component `components/NarratorPanel.tsx` that displays the streamed narration or an error message.
- **Error_Mapper**: The functions `errorToStatus` and `errorToJson` in `lib/errors.ts`.

## Requirements

### Requirement 1: Provider Registry

**User Story:** As a developer, I want all providers registered in one lookup table, so that I can add a new LLM provider with one entry and no route changes.

#### Acceptance Criteria

1. THE Model_Resolver SHALL export a function `getNarratorModel(env)` that returns a Narrator_Model.
2. THE Model_Resolver SHALL accept the Env as a function parameter and SHALL read no value from `process.env` inside `getNarratorModel`.
3. THE Provider_Registry SHALL contain one entry per Provider with a model factory, a default model ID, and a required API-key environment variable name.
4. THE Provider_Registry SHALL contain the `google` Provider with default model ID `gemini-4-hydrogen` and API-key variable `GOOGLE_GENERATIVE_AI_API_KEY`.
5. THE Provider_Registry SHALL contain the `anthropic` Provider with default model ID `claude-haiku-5-5` and API-key variable `ANTHROPIC_API_KEY`.
6. THE Model_Resolver SHALL be the only module in the codebase that imports a Provider SDK package.
7. WHEN a new Provider entry is added to the Provider_Registry, THE Model_Resolver SHALL select that Provider by name without any change to the Narrator_Route.

### Requirement 2: Provider Selection by Configuration

**User Story:** As a developer, I want to choose the provider and model through environment variables, so that I can switch between Gemini and Claude without code changes.

#### Acceptance Criteria

1. WHEN `NARRATOR_PROVIDER` is unset or empty, THE Model_Resolver SHALL select the `google` Provider.
2. WHEN `NARRATOR_PROVIDER` is `anthropic`, THE Model_Resolver SHALL select the `anthropic` Provider.
3. WHEN `NARRATOR_PROVIDER` is `google`, THE Model_Resolver SHALL select the `google` Provider.
4. WHEN `NARRATOR_MODEL` is unset or empty, THE Model_Resolver SHALL use the default model ID of the selected Provider.
5. WHEN `NARRATOR_MODEL` is set to a non-empty value, THE Model_Resolver SHALL use that value as the model ID for the selected Provider.
6. THE Model_Resolver SHALL read the API key for the selected Provider from the Env variable named in the Provider_Registry entry.
7. THE Model_Resolver SHALL select the Provider by exact lowercase name match after trimming surrounding whitespace from `NARRATOR_PROVIDER`.

### Requirement 3: Configuration Failure Modes

**User Story:** As a developer, I want clear errors when the narrator is misconfigured, so that I can fix the configuration without guessing.

#### Acceptance Criteria

1. IF `NARRATOR_PROVIDER` names a provider that is not in the Provider_Registry, THEN THE Model_Resolver SHALL throw an UnknownNarratorProviderError whose message contains the unknown value and the list of supported provider names.
2. IF the API-key variable of the selected Provider is unset or empty in the Env, THEN THE Model_Resolver SHALL throw a NarratorNotConfiguredError whose message contains the exact name of the missing variable.
3. THE NarratorNotConfiguredError message SHALL omit the value of every API key.
4. THE UnknownNarratorProviderError message SHALL omit the value of every API key.
5. IF the selected Provider is not configured, THEN THE Model_Resolver SHALL throw without selecting a different Provider.
6. THE Error_Mapper SHALL map NarratorNotConfiguredError to HTTP status 503.
7. THE Error_Mapper SHALL map UnknownNarratorProviderError to HTTP status 503.
8. WHEN the Error_Mapper serialises a NarratorNotConfiguredError or an UnknownNarratorProviderError, THE Error_Mapper SHALL return a JSON object containing the error message and a `code` string.

### Requirement 4: Narrator Route Behavior

**User Story:** As a user, I want the narrator route to behave as before, so that the narration experience is unchanged when the provider changes.

#### Acceptance Criteria

1. WHEN the Narrator_Route receives a request, THE Narrator_Route SHALL resolve the Narrator_Model through `getNarratorModel(process.env)` before the rate-limit check.
2. IF `getNarratorModel` throws a NarratorNotConfiguredError or an UnknownNarratorProviderError, THEN THE Narrator_Route SHALL respond with HTTP 503 and a JSON body produced by the Error_Mapper.
3. IF the per-IP rate limit of 10 requests per minute is exceeded, THEN THE Narrator_Route SHALL respond with HTTP 429.
4. IF the request body fails `narrateBodySchema` validation, THEN THE Narrator_Route SHALL respond with HTTP 400.
5. WHEN a valid request is accepted, THE Narrator_Route SHALL stream the narration with `streamText` and return `toDataStreamResponse()`.
6. THE Narrator_Route SHALL import no Provider SDK package.
7. WHEN the Narrator_Route responds with HTTP 503 for a configuration error, THE Narrator_Panel SHALL display the error message from the JSON body.
8. THE Narrator_Route SHALL log no API key value.

### Requirement 5: Configuration and Documentation

**User Story:** As a developer, I want the configuration and steering documents updated, so that the team knows how to select a provider.

#### Acceptance Criteria

1. THE `.env.local.example` file SHALL document `NARRATOR_PROVIDER`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, and `NARRATOR_MODEL`.
2. THE `.env.local.example` file SHALL state that `google` is the default Provider and give the default model ID of each Provider.
3. THE `.env.local.example` file SHALL state that only the API key of the selected Provider is required.
4. THE `.kiro/steering/tech.md` file SHALL state that the narrator streams from Google Gemini by default and that the provider is swappable through the Provider_Registry.
5. THE `package.json` file SHALL list `@ai-sdk/google` at a 1.x version compatible with `ai` 4.x.

### Requirement 6: Output Completeness

**User Story:** As a user, I want a complete narration from the default Gemini model, so that the story is not cut off or empty.

#### Acceptance Criteria

1. WHEN a real narration request runs against the Default_Google_Model with a valid API key, THE Narrator_Route SHALL stream a non-empty narration that ends at a complete sentence.
2. IF hidden model reasoning tokens consume the Token_Limit and truncate or empty the narration, THEN THE Narrator_Route SHALL use a higher Token_Limit or a lower reasoning budget so that the narration completes.
3. THE verification of criterion 1 SHALL be performed manually with a real Google API key and recorded in the task completion notes.
4. WHEN the Provider is `anthropic`, THE Narrator_Route SHALL produce a complete narration at the configured Token_Limit.

### Requirement 7: Unit Tests

**User Story:** As a developer, I want unit tests for the resolver and the new errors, so that provider selection and failure modes stay correct.

#### Acceptance Criteria

1. THE test suite SHALL include a colocated test file `lib/narrator/model.test.ts` for the Model_Resolver.
2. THE test suite SHALL verify that `getNarratorModel` selects the `google` Provider with model ID `gemini-4-hydrogen` when `NARRATOR_PROVIDER` and `NARRATOR_MODEL` are unset and `GOOGLE_GENERATIVE_AI_API_KEY` is set.
3. THE test suite SHALL verify that `getNarratorModel` selects the `anthropic` Provider with model ID `claude-haiku-5-5` when `NARRATOR_PROVIDER` is `anthropic` and `ANTHROPIC_API_KEY` is set.
4. THE test suite SHALL verify that a non-empty `NARRATOR_MODEL` overrides the default model ID for each Provider.
5. THE test suite SHALL verify that `getNarratorModel` throws NarratorNotConfiguredError naming the missing variable for each Provider when its API key is unset.
6. THE test suite SHALL verify that `getNarratorModel` throws UnknownNarratorProviderError listing the supported providers when `NARRATOR_PROVIDER` is not in the Provider_Registry.
7. THE test suite SHALL verify that no thrown error message contains the API key value supplied in the Env.
8. THE test suite SHALL verify that the Error_Mapper returns HTTP status 503 and a JSON body with a `code` for NarratorNotConfiguredError and UnknownNarratorProviderError in `lib/errors.test.ts`.

### Requirement 8: Project Health and Security

**User Story:** As a maintainer, I want the change to keep the project healthy, so that existing behavior and security guarantees hold.

#### Acceptance Criteria

1. THE Narrator_Route and Model_Resolver SHALL read API keys only from environment variables.
2. THE Narrator_Route SHALL send no API key value to the client.
3. WHEN `npm run test` runs after the change, THE test suite SHALL pass, including the 114 tests that exist before the change.
4. WHEN `npm run lint` runs after the change, THE linter SHALL report no errors.
5. WHEN `npx tsc --noEmit` runs after the change, THE compiler SHALL report no errors.
6. WHEN `npm run build` runs after the change, THE build SHALL complete without errors.
