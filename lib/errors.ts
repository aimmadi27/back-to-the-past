/**
 * Typed error classes for Back to the Past.
 * Route handlers map these to HTTP status codes in one place.
 */

export class InvalidDomainError extends Error {
  readonly code = "INVALID_DOMAIN";
  constructor(domain: string) {
    super(`Invalid domain: "${domain}". Provide a plain hostname (e.g. example.com).`);
    this.name = "InvalidDomainError";
  }
}

export class InvalidTimestampError extends Error {
  readonly code = "INVALID_TIMESTAMP";
  constructor(value: string) {
    super(`Invalid timestamp: "${value}". Expected a 14-digit Wayback timestamp (e.g. 20090815120000).`);
    this.name = "InvalidTimestampError";
  }
}

export class NoSnapshotsError extends Error {
  readonly code = "NO_SNAPSHOTS";
  constructor(domain: string) {
    super(`No snapshots found for "${domain}" in the Internet Archive.`);
    this.name = "NoSnapshotsError";
  }
}

export class ArchiveUnavailableError extends Error {
  readonly code = "ARCHIVE_UNAVAILABLE";
  constructor(message: string) {
    super(`Internet Archive unavailable: ${message}`);
    this.name = "ArchiveUnavailableError";
  }
}

export class SnapshotNotFoundError extends Error {
  readonly code = "SNAPSHOT_NOT_FOUND";
  constructor(domain: string, timestamp: string) {
    super(`Snapshot not found for "${domain}" at ${timestamp}.`);
    this.name = "SnapshotNotFoundError";
  }
}

const MAX_ECHOED_PROVIDER_LENGTH = 50;

export class NarratorNotConfiguredError extends Error {
  readonly code = "NARRATOR_NOT_CONFIGURED";
  constructor(provider: string, envVar: string) {
    super(`Narrator is offline: ${envVar} is not configured for provider "${provider}".`);
    this.name = "NarratorNotConfiguredError";
  }
}

export class UnknownNarratorProviderError extends Error {
  readonly code = "UNKNOWN_NARRATOR_PROVIDER";
  constructor(provider: string, supported: string[]) {
    // Truncated so a value pasted into NARRATOR_PROVIDER by mistake (e.g. a key) is not echoed in full.
    const shown = provider.slice(0, MAX_ECHOED_PROVIDER_LENGTH);
    super(`Unknown narrator provider: "${shown}". Supported providers: ${supported.join(", ")}.`);
    this.name = "UnknownNarratorProviderError";
  }
}

/** Map a typed error to an HTTP status code. */
export function errorToStatus(err: unknown): number {
  if (err instanceof InvalidDomainError) return 400;
  if (err instanceof InvalidTimestampError) return 400;
  if (err instanceof NoSnapshotsError) return 404;
  if (err instanceof SnapshotNotFoundError) return 404;
  if (err instanceof ArchiveUnavailableError) return 502;
  if (err instanceof NarratorNotConfiguredError) return 503;
  if (err instanceof UnknownNarratorProviderError) return 503;
  return 500;
}

/** Safe serialisation for API error responses. */
export function errorToJson(err: unknown): { error: string; code?: string } {
  if (
    err instanceof InvalidDomainError ||
    err instanceof InvalidTimestampError ||
    err instanceof NoSnapshotsError ||
    err instanceof SnapshotNotFoundError ||
    err instanceof ArchiveUnavailableError ||
    err instanceof NarratorNotConfiguredError ||
    err instanceof UnknownNarratorProviderError
  ) {
    return { error: err.message, code: err.code };
  }
  return { error: "An unexpected error occurred." };
}
