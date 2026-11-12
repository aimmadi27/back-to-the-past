import { notFound } from "next/navigation";
import { validateDomain } from "@/lib/validation/domain";
import { fetchYearlySnapshots } from "@/lib/wayback/cdx";
import { InvalidDomainError, NoSnapshotsError, ArchiveUnavailableError } from "@/lib/errors";
import TimeTravelView from "./TimeTravelView";

interface PageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);
  return {
    title: `${decoded} through time · Back to the Past`,
  };
}

/**
 * Server component: validates the domain, fetches the yearly snapshot list,
 * then passes the data to the client-side TimeTravelView.
 */
export default async function DomainPage({ params }: PageProps) {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);

  let validDomain: string;
  try {
    validDomain = validateDomain(decoded);
  } catch (err) {
    if (err instanceof InvalidDomainError) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl">🪦</div>
            <h1 className="text-xl font-semibold text-bone">Invalid domain</h1>
            <p className="text-gray-400 text-sm">{err.message}</p>
            <a href="/" className="text-pumpkin underline underline-offset-2 text-sm">
              ← Back to the crypt
            </a>
          </div>
        </main>
      );
    }
    throw err;
  }

  let snapshots;
  try {
    snapshots = await fetchYearlySnapshots(validDomain);
  } catch (err) {
    if (err instanceof NoSnapshotsError) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl">🕸️</div>
            <h1 className="text-xl font-semibold text-bone">No snapshots found</h1>
            <p className="text-gray-400 text-sm">
              The Internet Archive has no record of{" "}
              <strong className="text-bone">{validDomain}</strong>. It may not
              have been captured, or it may not exist.
            </p>
            <a href="/" className="text-pumpkin underline underline-offset-2 text-sm">
              ← Back to the crypt
            </a>
          </div>
        </main>
      );
    }

    if (err instanceof ArchiveUnavailableError) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl">⌛</div>
            <h1 className="text-xl font-semibold text-bone">The archive is slow</h1>
            <p className="text-gray-400 text-sm">
              The Internet Archive didn&apos;t respond in time for{" "}
              <strong className="text-bone">{validDomain}</strong>. This is common for
              popular domains. Try again in a moment.
            </p>
            <a href={`/${encodeURIComponent(validDomain)}`} className="text-pumpkin underline underline-offset-2 text-sm">
              Try again
            </a>
            <span className="text-gray-600 mx-2 text-sm">·</span>
            <a href="/" className="text-gray-500 underline underline-offset-2 text-sm">
              ← Back to the crypt
            </a>
          </div>
        </main>
      );
    }

    throw err;
  }

  if (!snapshots || snapshots.length === 0) {
    notFound();
  }

  return <TimeTravelView domain={validDomain} snapshots={snapshots} />;
}
