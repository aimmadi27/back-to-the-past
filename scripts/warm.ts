/**
 * Pre-warm snapshot lists for all curated example domains.
 * Run with: npm run warm
 *
 * Hits the local /api/snapshots endpoint so Next.js caches the CDX responses
 * before the demo starts.
 */

const BASE_URL = process.env.WARM_BASE_URL ?? "http://localhost:3000";

const CURATED_EXAMPLES = [
  "apple.com",
  "google.com",
  "amazon.com",
  "myspace.com",
  "geocities.ws",
  "bbc.co.uk",
];

async function warm(domain: string): Promise<void> {
  const url = `${BASE_URL}/api/snapshots?domain=${encodeURIComponent(domain)}`;
  console.log(`→ Warming ${domain}…`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) {
      const data = await res.json();
      console.log(`  ✓ ${domain}: ${data.snapshots?.length ?? 0} snapshots`);
    } else {
      console.error(`  ✗ ${domain}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`  ✗ ${domain}: ${err instanceof Error ? err.message : err}`);
  }
}

(async () => {
  console.log(`Warming ${CURATED_EXAMPLES.length} domains against ${BASE_URL}…\n`);
  for (const domain of CURATED_EXAMPLES) {
    await warm(domain);
  }
  console.log("\nDone.");
})();
