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

/** Map a typed error to an HTTP status code. */
export function errorToStatus(err: unknown): number {
  if (err instanceof InvalidDomainError) return 400;
  if (err instanceof InvalidTimestampError) return 400;
  if (err instanceof NoSnapshotsError) return 404;
  if (err instanceof SnapshotNotFoundError) return 404;
  if (err instanceof ArchiveUnavailableError) return 502;
  return 500;
}

/** Safe serialisation for API error responses. */
export function errorToJson(err: unknown): { error: string; code?: string } {
  if (
    err instanceof InvalidDomainError ||
    err instanceof InvalidTimestampError ||
    err instanceof NoSnapshotsError ||
    err instanceof SnapshotNotFoundError ||
    err instanceof ArchiveUnavailableError
  ) {
    return { error: err.message, code: err.code };
  }
  return { error: "An unexpected error occurred." };
}
