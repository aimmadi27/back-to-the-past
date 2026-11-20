import { NextRequest, NextResponse } from "next/server";
import { validateDomain } from "@/lib/validation/domain";
import { fetchSnapshotHtml } from "@/lib/wayback/fetch-snapshot";
import { extractFeatures } from "@/lib/diff/extract-features";
import { diffFeatures } from "@/lib/diff/diff-features";
import { validateOriginalUrl } from "@/lib/wayback/validate-original";
import { errorToStatus, errorToJson, InvalidTimestampError } from "@/lib/errors";

/**
 * GET /api/diff?domain=&from=&to=&fromOriginal=&toOriginal=
 *
 * Returns a structured JSON diff between two snapshots.
 * `fromOriginal` and `toOriginal` are the CDX `original` URLs for each timestamp.
 * Both must have hostnames matching `domain`.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "";
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const fromOriginal = request.nextUrl.searchParams.get("fromOriginal") ?? "";
  const toOriginal = request.nextUrl.searchParams.get("toOriginal") ?? "";

  try {
    const validDomain = validateDomain(domain);

    if (!from || !/^\d{14}$/.test(from)) {
      throw new InvalidTimestampError(from);
    }
    if (!to || !/^\d{14}$/.test(to)) {
      throw new InvalidTimestampError(to);
    }
    if (from === to) {
      return NextResponse.json(
        { error: "Cannot diff a snapshot against itself. Choose two different years." },
        { status: 400 }
      );
    }

    const fromUrl = validateOriginalUrl(fromOriginal, validDomain);
    const toUrl = validateOriginalUrl(toOriginal, validDomain);

    const [fromHtml, toHtml] = await Promise.all([
      fetchSnapshotHtml(validDomain, from, fromUrl),
      fetchSnapshotHtml(validDomain, to, toUrl),
    ]);

    const fromFeatures = extractFeatures(fromHtml);
    const toFeatures = extractFeatures(toHtml);

    const fromYear = parseInt(from.slice(0, 4), 10);
    const toYear = parseInt(to.slice(0, 4), 10);

    const diff = diffFeatures(fromFeatures, fromYear, toFeatures, toYear);

    return NextResponse.json(diff, {
      headers: {
        "Cache-Control": "public, s-maxage=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json(errorToJson(err), { status: errorToStatus(err) });
  }
}
