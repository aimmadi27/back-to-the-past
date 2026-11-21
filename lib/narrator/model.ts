import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { NarratorNotConfiguredError, UnknownNarratorProviderError } from "@/lib/errors";

/**
 * The single seam for choosing the narrator's LLM. This is the only module
 * that imports a provider SDK. To add a provider: install its SDK, add one
 * entry to PROVIDERS, and document its key in .env.local.example.
 */

export type Env = Record<string, string | undefined>;

export interface ProviderEntry {
  defaultModel: string;
  /** Name of the env var that holds this provider's API key. */
  apiKeyEnv: string;
  create: (modelId: string, apiKey: string) => LanguageModel;
}

export interface NarratorModel {
  model: LanguageModel;
  provider: string;
  modelId: string;
}

export const DEFAULT_PROVIDER = "google";

/**
 * Output token budget for one narration. Gemini's hidden thinking tokens can
 * count against this, so it may need raising after a real run (see spec task 7.1).
 */
export const NARRATOR_MAX_TOKENS = 400;

// The key is passed explicitly (not read from process.env by the SDK) so the
// `env` argument stays the only source of truth and the resolver stays testable.
export const PROVIDERS: Record<string, ProviderEntry> = {
  google: {
    defaultModel: "gemini-4-hydrogen",
    apiKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    create: (modelId, apiKey) => createGoogleGenerativeAI({ apiKey })(modelId),
  },
  anthropic: {
    defaultModel: "claude-haiku-5-5",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    create: (modelId, apiKey) => createAnthropic({ apiKey })(modelId),
  },
};

/**
 * Resolve the narrator model from configuration.
 * Throws UnknownNarratorProviderError or NarratorNotConfiguredError; never
 * falls back to another provider.
 */
export function getNarratorModel(
  env: Env,
  registry: Record<string, ProviderEntry> = PROVIDERS
): NarratorModel {
  const provider = (env.NARRATOR_PROVIDER ?? "").trim().toLowerCase() || DEFAULT_PROVIDER;

  // hasOwn so names like "constructor" or "__proto__" don't match inherited properties
  const entry = Object.hasOwn(registry, provider) ? registry[provider] : undefined;
  if (!entry) {
    throw new UnknownNarratorProviderError(provider, Object.keys(registry));
  }

  const apiKey = env[entry.apiKeyEnv];
  if (!apiKey || apiKey.trim() === "") {
    throw new NarratorNotConfiguredError(provider, entry.apiKeyEnv);
  }

  const modelId = (env.NARRATOR_MODEL ?? "").trim() || entry.defaultModel;
  return { model: entry.create(modelId, apiKey), provider, modelId };
}
