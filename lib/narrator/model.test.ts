import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getNarratorModel,
  PROVIDERS,
  NARRATOR_MAX_TOKENS,
  type ProviderEntry,
  type Env,
} from "./model";
import {
  NarratorNotConfiguredError,
  UnknownNarratorProviderError,
  errorToStatus,
  errorToJson,
} from "@/lib/errors";

const GOOGLE_KEY = "GOOGLE_GENERATIVE_AI_API_KEY";
const ANTHROPIC_KEY = "ANTHROPIC_API_KEY";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getNarratorModel — selection", () => {
  it("defaults to google with gemini-4-hydrogen", () => {
    const r = getNarratorModel({ [GOOGLE_KEY]: "g-key" });
    expect(r.provider).toBe("google");
    expect(r.modelId).toBe("gemini-4-hydrogen");
    expect(r.model).toBeDefined();
  });

  it("selects anthropic with claude-haiku-5-5 when asked", () => {
    const r = getNarratorModel({ NARRATOR_PROVIDER: "anthropic", [ANTHROPIC_KEY]: "a-key" });
    expect(r.provider).toBe("anthropic");
    expect(r.modelId).toBe("claude-haiku-5-5");
  });

  it("selects google explicitly", () => {
    const r = getNarratorModel({ NARRATOR_PROVIDER: "google", [GOOGLE_KEY]: "g-key" });
    expect(r.provider).toBe("google");
  });

  it("trims and lowercases the provider name", () => {
    const r = getNarratorModel({ NARRATOR_PROVIDER: "  Anthropic ", [ANTHROPIC_KEY]: "a-key" });
    expect(r.provider).toBe("anthropic");
  });

  it("treats a blank provider as the default", () => {
    const r = getNarratorModel({ NARRATOR_PROVIDER: "   ", [GOOGLE_KEY]: "g-key" });
    expect(r.provider).toBe("google");
  });

  it.each([
    ["google", GOOGLE_KEY, "gemini-custom"],
    ["anthropic", ANTHROPIC_KEY, "claude-custom"],
  ])("honors NARRATOR_MODEL for %s", (provider, keyVar, custom) => {
    const r = getNarratorModel({ NARRATOR_PROVIDER: provider, [keyVar]: "k", NARRATOR_MODEL: custom });
    expect(r.modelId).toBe(custom);
  });

  it.each(["", "   "])("falls back to the default model when NARRATOR_MODEL is %j", (blank) => {
    const r = getNarratorModel({ [GOOGLE_KEY]: "g-key", NARRATOR_MODEL: blank });
    expect(r.modelId).toBe("gemini-4-hydrogen");
  });

  it("exposes a positive token budget", () => {
    expect(NARRATOR_MAX_TOKENS).toBeGreaterThan(0);
  });
});

describe("getNarratorModel — missing keys", () => {
  it.each([
    ["google", GOOGLE_KEY],
    ["anthropic", ANTHROPIC_KEY],
  ])("throws NarratorNotConfiguredError naming %s's variable", (provider, keyVar) => {
    for (const blank of [undefined, "", "   "]) {
      const env: Env = { NARRATOR_PROVIDER: provider, [keyVar]: blank };
      expect(() => getNarratorModel(env)).toThrow(NarratorNotConfiguredError);
      expect(() => getNarratorModel(env)).toThrow(keyVar);
    }
  });

  it("does not fall back to the other provider's key", () => {
    // google selected (default), only the anthropic key is present
    expect(() => getNarratorModel({ [ANTHROPIC_KEY]: "a-key" })).toThrow(NarratorNotConfiguredError);
    // anthropic selected, only the google key is present
    expect(() =>
      getNarratorModel({ NARRATOR_PROVIDER: "anthropic", [GOOGLE_KEY]: "g-key" })
    ).toThrow(NarratorNotConfiguredError);
  });
});

describe("getNarratorModel — unknown providers", () => {
  it.each(["openai", "constructor", "__proto__", "toString", "zzz-random-123"])(
    "throws UnknownNarratorProviderError for %j and lists supported providers",
    (name) => {
      let caught: unknown;
      try {
        getNarratorModel({ NARRATOR_PROVIDER: name, [GOOGLE_KEY]: "g-key" });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(UnknownNarratorProviderError);
      const msg = (caught as Error).message;
      expect(msg).toContain(name.toLowerCase());
      expect(msg).toContain("google");
      expect(msg).toContain("anthropic");
    }
  );

  it("reports an unknown provider even when no key is set", () => {
    expect(() => getNarratorModel({ NARRATOR_PROVIDER: "openai" })).toThrow(UnknownNarratorProviderError);
  });
});

describe("getNarratorModel — secrets", () => {
  it("never puts a key value in a thrown message", () => {
    const secret = "sk-SECRET-123";
    const cases: Env[] = [
      { NARRATOR_PROVIDER: "openai", [GOOGLE_KEY]: secret, [ANTHROPIC_KEY]: secret },
      { NARRATOR_PROVIDER: "anthropic", [GOOGLE_KEY]: secret }, // wrong provider's key set
      { [ANTHROPIC_KEY]: secret }, // google selected, only anthropic key set
    ];
    for (const env of cases) {
      let message = "";
      try {
        getNarratorModel(env);
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).not.toBe("");
      expect(message).not.toContain(secret);
    }
  });
});

describe("getNarratorModel — injected registry and env isolation", () => {
  it("selects an injected entry by name and passes it the env key and resolved model ID", () => {
    const create = vi.fn(() => ({}) as never);
    const entry: ProviderEntry = { defaultModel: "stub-default", apiKeyEnv: "STUB_KEY", create };
    const registry = { stub: entry };

    const r = getNarratorModel({ NARRATOR_PROVIDER: "stub", STUB_KEY: "stub-secret" }, registry);
    expect(r.provider).toBe("stub");
    expect(r.modelId).toBe("stub-default");
    expect(create).toHaveBeenCalledWith("stub-default", "stub-secret");

    getNarratorModel(
      { NARRATOR_PROVIDER: "stub", STUB_KEY: "stub-secret", NARRATOR_MODEL: "stub-override" },
      registry
    );
    expect(create).toHaveBeenLastCalledWith("stub-override", "stub-secret");
  });

  it("needs no change outside the registry to support a new provider", () => {
    const registry = {
      ...PROVIDERS,
      openai: {
        defaultModel: "gpt-test",
        apiKeyEnv: "OPENAI_API_KEY",
        create: () => ({}) as never,
      },
    };
    const r = getNarratorModel({ NARRATOR_PROVIDER: "openai", OPENAI_API_KEY: "o-key" }, registry);
    expect(r.provider).toBe("openai");
    expect(r.modelId).toBe("gpt-test");
  });

  it("ignores process.env entirely", () => {
    vi.stubEnv("NARRATOR_PROVIDER", "anthropic");
    vi.stubEnv("NARRATOR_MODEL", "from-process-env");
    vi.stubEnv(ANTHROPIC_KEY, "process-key");
    const r = getNarratorModel({ [GOOGLE_KEY]: "g-key" });
    expect(r.provider).toBe("google");
    expect(r.modelId).toBe("gemini-4-hydrogen");
  });
});

describe("configuration errors map to 503", () => {
  it("maps every config error thrown by the resolver to 503 with a code", () => {
    const envs: Env[] = [{ NARRATOR_PROVIDER: "nope" }, {}, { NARRATOR_PROVIDER: "anthropic" }];
    for (const env of envs) {
      try {
        getNarratorModel(env);
        throw new Error("expected getNarratorModel to throw");
      } catch (e) {
        expect(errorToStatus(e)).toBe(503);
        const json = errorToJson(e);
        expect(json.code).toMatch(/^(NARRATOR_NOT_CONFIGURED|UNKNOWN_NARRATOR_PROVIDER)$/);
        expect(json.error).toBe((e as Error).message);
      }
    }
  });
});
