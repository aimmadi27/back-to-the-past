import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSnapshotHtml } from "./fetch-snapshot";
import { SnapshotNotFoundError, ArchiveUnavailableError } from "@/lib/errors";

const DOMAIN = "example.com";
const TIMESTAMP = "20090815120000";
const ORIGINAL_URL = "http://example.com/";
const HTML = "<html><body>Hello from 2009</body></html>";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSnapshotHtml", () => {
  it("returns HTML on a 200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => HTML,
    } as Response);

    const result = await fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL);
    expect(result).toBe(HTML);
  });

  it("throws SnapshotNotFoundError on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL)).rejects.toThrow(
      SnapshotNotFoundError
    );
  });

  it("throws ArchiveUnavailableError on 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL)).rejects.toThrow(
      ArchiveUnavailableError
    );
  });

  it("throws ArchiveUnavailableError on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    await expect(fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL)).rejects.toThrow(
      ArchiveUnavailableError
    );
  });

  it("throws ArchiveUnavailableError on timeout (AbortError)", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

    await expect(fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL)).rejects.toThrow(
      ArchiveUnavailableError
    );
  });

  it("includes domain and timestamp in SnapshotNotFoundError message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchSnapshotHtml(DOMAIN, TIMESTAMP, ORIGINAL_URL)).rejects.toThrow(
      DOMAIN
    );
  });
});
