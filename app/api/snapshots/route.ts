import { NextRequest, NextResponse } from "next/server";
import { validateDomain } from "@/lib/validation/domain";
import { fetchYearlySnapshots } from "@/lib/wayback/cdx";
import { errorToStatus, errorToJson } from "@/lib/errors";

/**
 * GET /api/snapshots?domain=<domain>
 * Returns a list of yearly snapshots for the given domain.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "";

  try {
    const validDomain = validateDomain(domain);
    const snapshots = await fetchYearlySnapshots(validDomain);

    return NextResponse.json(
      { domain: validDomain, snapshots },
      {
        headers: {
          // Cache at the CDN for 1 hour; stale-while-revalidate for 10 minutes
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(errorToJson(err), { status: errorToStatus(err) });
  }
}
