import { describe, it, expect } from "vitest";
import {
  InvalidDomainError,
  InvalidTimestampError,
  NoSnapshotsError,
  ArchiveUnavailableError,
  SnapshotNotFoundError,
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
