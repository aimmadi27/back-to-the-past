import { describe, it, expect } from "vitest";
import {
  InvalidDomainError,
  InvalidTimestampError,
  NoSnapshotsError,
  ArchiveUnavailableError,
  SnapshotNotFoundError,
  NarratorNotConfiguredError,
  UnknownNarratorProviderError,
  errorToStatus,
  errorToJson,
} from "./errors";

describe("typed error classes", () => {
  it("InvalidDomainError has correct code and name", () => {
    const err = new InvalidDomainError("bad input");
    expect(err.code).toBe("INVALID_DOMAIN");
    expect(err.name).toBe("InvalidDomainError");
    expect(err.message).toContain("bad input");
  });

  it("InvalidTimestampError has correct code and name", () => {
    const err = new InvalidTimestampError("abc");
    expect(err.code).toBe("INVALID_TIMESTAMP");
    expect(err.name).toBe("InvalidTimestampError");
    expect(err.message).toContain("abc");
  });

  it("NoSnapshotsError has correct code", () => {
    const err = new NoSnapshotsError("example.com");
    expect(err.code).toBe("NO_SNAPSHOTS");
  });

  it("ArchiveUnavailableError has correct code", () => {
    const err = new ArchiveUnavailableError("timeout");
    expect(err.code).toBe("ARCHIVE_UNAVAILABLE");
  });

  it("SnapshotNotFoundError has correct code", () => {
    const err = new SnapshotNotFoundError("example.com", "20090101000000");
    expect(err.code).toBe("SNAPSHOT_NOT_FOUND");
  });
});

describe("errorToStatus", () => {
  it("maps InvalidDomainError → 400", () => {
    expect(errorToStatus(new InvalidDomainError("x"))).toBe(400);
  });
  it("maps InvalidTimestampError → 400", () => {
    expect(errorToStatus(new InvalidTimestampError("x"))).toBe(400);
  });
  it("maps NoSnapshotsError → 404", () => {
    expect(errorToStatus(new NoSnapshotsError("x"))).toBe(404);
  });
  it("maps SnapshotNotFoundError → 404", () => {
    expect(errorToStatus(new SnapshotNotFoundError("x", "y"))).toBe(404);
  });
  it("maps ArchiveUnavailableError → 502", () => {
    expect(errorToStatus(new ArchiveUnavailableError("x"))).toBe(502);
  });
  it("maps unknown errors → 500", () => {
    expect(errorToStatus(new Error("unknown"))).toBe(500);
  });
});

describe("errorToJson", () => {
  it("serialises typed errors with code", () => {
    const result = errorToJson(new InvalidDomainError("bad"));
    expect(result.code).toBe("INVALID_DOMAIN");
    expect(typeof result.error).toBe("string");
  });

  it("returns generic message for unknown errors", () => {
    const result = errorToJson(new Error("oops"));
    expect(result.error).toBe("An unexpected error occurred.");
    expect(result.code).toBeUndefined();
  });
});

describe("narrator configuration errors", () => {
  it("NarratorNotConfiguredError has code, name and names the variable", () => {
    const err = new NarratorNotConfiguredError("google", "GOOGLE_GENERATIVE_AI_API_KEY");
    expect(err.code).toBe("NARRATOR_NOT_CONFIGURED");
    expect(err.name).toBe("NarratorNotConfiguredError");
    expect(err.message).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(err.message).toContain("google");
  });

  it("UnknownNarratorProviderError has code, name, the value and supported names", () => {
    const err = new UnknownNarratorProviderError("openai", ["google", "anthropic"]);
    expect(err.code).toBe("UNKNOWN_NARRATOR_PROVIDER");
    expect(err.name).toBe("UnknownNarratorProviderError");
    expect(err.message).toContain("openai");
    expect(err.message).toContain("google");
    expect(err.message).toContain("anthropic");
  });

  it("UnknownNarratorProviderError truncates a long provider name to 50 characters", () => {
    const long = "x".repeat(200);
    const err = new UnknownNarratorProviderError(long, ["google"]);
    expect(err.message).toContain("x".repeat(50));
    expect(err.message).not.toContain("x".repeat(51));
  });

  it("maps both configuration errors to 503", () => {
    expect(errorToStatus(new NarratorNotConfiguredError("google", "K"))).toBe(503);
    expect(errorToStatus(new UnknownNarratorProviderError("nope", ["google"]))).toBe(503);
  });

  it("serialises both configuration errors with error and code", () => {
    const a = new NarratorNotConfiguredError("anthropic", "ANTHROPIC_API_KEY");
    const b = new UnknownNarratorProviderError("nope", ["google"]);
    expect(errorToJson(a)).toEqual({ error: a.message, code: "NARRATOR_NOT_CONFIGURED" });
    expect(errorToJson(b)).toEqual({ error: b.message, code: "UNKNOWN_NARRATOR_PROVIDER" });
  });
});
