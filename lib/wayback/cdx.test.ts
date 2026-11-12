import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchYearlySnapshots, _clearCacheForTest } from "./cdx";
import { NoSnapshotsError, ArchiveUnavailableError } from "@/lib/errors";

// CDX header row + two data rows in reverse chronological order
const CDX_ROWS = [
  ["timestamp", "original", "statuscode"],
  ["20120501120000", "http://example.com/", "200"],
  ["20050301090000", "http://example.com/", "200"],
];

function mockFetch(response: Partial<Response> & { _body?: unknown }): void {
  const { _body, ...rest } = response;
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => _body,
    text: async () => String(_body),
    ...rest,
  } as Response);
}

beforeEach(() => {
  _clearCacheForTest();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchYearlySnapshots", () => {
  it("returns snapshots sorted ascending by timestamp and parses years", async () => {
    mockFetch({ _body: CDX_ROWS });

    const snapshots = await fetchYearlySnapshots("example.com");

    expect(snapshots).toHaveLength(2);
    // Should be sorted ascending
    expect(snapshots[0].timestamp).toBe("20050301090000");
    expect(snapshots[0].year).toBe(2005);
    expect(snapshots[1].timestamp).toBe("20120501120000");
    expect(snapshots[1].year).toBe(2012);
  });

  it("includes original URL and statusCode on each snapshot", async () => {
    mockFetch({ _body: CDX_ROWS });

    const [first] = await fetchYearlySnapshots("example.com");
    expect(first.original).toBe("http://example.com/");
    expect(first.statusCode).toBe("200");
  });

  it("throws NoSnapshotsError when CDX returns header-only response", async () => {
    // Only the header row, no data
    mockFetch({ _body: [["timestamp", "original", "statuscode"]] });

    await expect(fetchYearlySnapshots("empty.com")).rejects.toThrow(NoSnapshotsError);
  });

  it("throws NoSnapshotsError when CDX returns an empty array", async () => {
    mockFetch({ _body: [] });

    await expect(fetchYearlySnapshots("empty.com")).rejects.toThrow(NoSnapshotsError);
  });

  it("throws ArchiveUnavailableError on non-200 HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchYearlySnapshots("example.com")).rejects.toThrow(ArchiveUnavailableError);
  });

  it("throws ArchiveUnavailableError on malformed JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    } as unknown as Response);

    await expect(fetchYearlySnapshots("example.com")).rejects.toThrow(ArchiveUnavailableError);
  });

  it("throws ArchiveUnavailableError on network error / timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fetch failed"));

    await expect(fetchYearlySnapshots("example.com")).rejects.toThrow(ArchiveUnavailableError);
  });

  it("returns cached result on second call without hitting fetch again", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => CDX_ROWS,
    } as Response);

    await fetchYearlySnapshots("cached.com");
    await fetchYearlySnapshots("cached.com");

    // fetch should only have been called once — second call hits in-memory cache
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
