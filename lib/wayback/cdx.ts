import { ArchiveUnavailableError, NoSnapshotsError } from "@/lib/errors";

export interface Snapshot {
  timestamp: string; // 14-digit Wayback timestamp e.g. "20090815120000"
  year: number;
  original: string;
  statusCode: string;
}

const CDX_BASE = "https://web.archive.org/cdx/search/cdx";
const WAYBACK_BASE = "https://web.archive.org/web";

// In-memory cache so repeat visits within the same server instance are instant.
// Key: domain → { snapshots, fetchedAt }
const snapshotCache = new Map<string, { snapshots: Snapshot[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch one snapshot per year for a domain from the CDX API.
 * Returns snapshots sorted ascending by year.
 *
 * Results are held in an in-memory cache (1 h TTL) in addition to
 * Next.js fetch caching so repeated visits are instant.
 */
export async function fetchYearlySnapshots(domain: string): Promise<Snapshot[]> {
  // Check in-memory cache first
  const cached = snapshotCache.get(domain);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.snapshots;
  }

  const params = new URLSearchParams({
    url: domain,
    output: "json",
    fl: "timestamp,original,statuscode",
    filter: "statuscode:200",
    collapse: "timestamp:4", // one per year
    limit: "50",
  });

  const url = `${CDX_BASE}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: 3600 }, // Next.js fetch cache: 1 hour
      signal: AbortSignal.timeout(45_000), // raised from 10s — CDX is slow for popular domains
    });
  } catch (err) {
    throw new ArchiveUnavailableError(
      err instanceof Error ? err.message : "fetch failed"
    );
  }

  if (!res.ok) {
    throw new ArchiveUnavailableError(`CDX API returned ${res.status}`);
  }

  let rows: string[][];
  try {
    rows = await res.json();
  } catch {
    throw new ArchiveUnavailableError("CDX API returned malformed JSON");
  }

  // First row is the header ["timestamp","original","statuscode"]
  if (!Array.isArray(rows) || rows.length <= 1) {
    throw new NoSnapshotsError(domain);
  }

  const [, ...data] = rows;

  const snapshots: Snapshot[] = data.map(([timestamp, original, statusCode]) => ({
    timestamp,
    year: parseInt(timestamp.slice(0, 4), 10),
    original,
    statusCode,
  }));

  // Sort ascending by timestamp
  snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Populate in-memory cache
  snapshotCache.set(domain, { snapshots, fetchedAt: Date.now() });

  return snapshots;
}

/** Build the Wayback URL to fetch raw snapshot HTML (id_ = no toolbar). */
export function snapshotHtmlUrl(timestamp: string, originalUrl: string): string {
  return `${WAYBACK_BASE}/${timestamp}id_/${originalUrl}`;
}

/** Build a Wayback asset URL for images (im_) or CSS (cs_). */
export function assetUrl(
  timestamp: string,
  assetSrc: string,
  type: "image" | "css" | "generic"
): string {
  const modifier = type === "image" ? "im_" : type === "css" ? "cs_" : "if_";
  return `${WAYBACK_BASE}/${timestamp}${modifier}/${assetSrc}`;
}
