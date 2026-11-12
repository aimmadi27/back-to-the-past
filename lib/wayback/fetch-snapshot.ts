import { ArchiveUnavailableError, SnapshotNotFoundError } from "@/lib/errors";
import { snapshotHtmlUrl } from "./cdx";

/**
 * Fetch the raw HTML string of a Wayback snapshot.
 * Uses the `id_` modifier so the Wayback toolbar is excluded.
 */
export async function fetchSnapshotHtml(
  domain: string,
  timestamp: string,
  originalUrl: string
): Promise<string> {
  const url = snapshotHtmlUrl(timestamp, originalUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      // Snapshots are immutable — cache forever (1 year)
      next: { revalidate: 31_536_000 },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new ArchiveUnavailableError(
      err instanceof Error ? err.message : "snapshot fetch failed"
    );
  }

  if (res.status === 404) {
    throw new SnapshotNotFoundError(domain, timestamp);
  }

  if (!res.ok) {
    throw new ArchiveUnavailableError(`Wayback returned ${res.status} for ${url}`);
  }

  return res.text();
}
