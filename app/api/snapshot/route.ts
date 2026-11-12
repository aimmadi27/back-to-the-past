import { NextRequest, NextResponse } from "next/server";
import { validateDomain } from "@/lib/validation/domain";
import { fetchSnapshotHtml } from "@/lib/wayback/fetch-snapshot";
import { rewriteAssetUrls } from "@/lib/wayback/rewrite-urls";
import { sanitizeHtml } from "@/lib/sanitize/sanitize";
import { errorToStatus, errorToJson, InvalidTimestampError } from "@/lib/errors";

/**
 * GET /api/snapshot?domain=<domain>&timestamp=<14-digit-ts>
 *
 * Returns sanitised, asset-rewritten HTML ready to embed in a sandboxed iframe.
 * Snapshots are immutable so we cache aggressively.
 *
 * Security headers prevent inline script execution even if the sanitiser
 * is bypassed and the response is opened directly in a browser tab.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "";
  const timestamp = request.nextUrl.searchParams.get("timestamp") ?? "";

  try {
    const validDomain = validateDomain(domain);

    if (!timestamp || !/^\d{14}$/.test(timestamp)) {
      throw new InvalidTimestampError(timestamp);
    }

    const originalUrl = `https://${validDomain}/`;
    const rawHtml = await fetchSnapshotHtml(validDomain, timestamp, originalUrl);
    const rewritten = rewriteAssetUrls(rawHtml, timestamp, originalUrl);
    const sanitised = sanitizeHtml(rewritten);

    return new NextResponse(sanitised, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Snapshots are immutable — cache for 1 year
        "Cache-Control": "public, s-maxage=31536000, immutable",
        // Defence-in-depth: even if opened directly in a tab, scripts can't run.
        // allow-popups is included so rewritten links with target="_blank" work.
        "Content-Security-Policy": "sandbox allow-popups allow-popups-to-escape-sandbox; script-src 'none'; object-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(errorToJson(err), { status: errorToStatus(err) });
  }
}
