"use client";

import { useEffect, useRef, useState } from "react";

interface SnapshotFrameProps {
  domain: string;
  timestamp: string;
  year: number;
  /** When true, this frame fades in (crossfade effect). */
  active: boolean;
}

/**
 * Renders a single archived snapshot inside a sandboxed iframe.
 * Scripts and inline event handlers are stripped server-side;
 * the sandbox attribute adds a second layer of defence at the browser.
 *
 * Uses crossfade: the outgoing frame stays visible while the new one fades in.
 */
export default function SnapshotFrame({
  domain,
  timestamp,
  year,
  active,
}: SnapshotFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = `/api/snapshot?domain=${encodeURIComponent(domain)}&timestamp=${encodeURIComponent(timestamp)}`;

  useEffect(() => {
    // Reset state when the snapshot changes
    setLoaded(false);
    setError(null);
  }, [timestamp]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${
        active ? "opacity-100 z-10" : "opacity-0 z-0"
      }`}
      aria-hidden={!active}
    >
      {/* Loading state */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-20">
          <div className="text-center space-y-2">
            <div className="text-3xl animate-pulse">👻</div>
            <p className="text-gray-400 text-sm">
              Summoning {year}…
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-20">
          <div className="text-center space-y-2 max-w-sm px-4">
            <div className="text-3xl">🪦</div>
            <p className="text-gray-300 text-sm font-semibold">Snapshot unavailable</p>
            <p className="text-gray-500 text-xs">{error}</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title={`${domain} in ${year}`}
        className="w-full h-full border-0"
        // Sandboxed: allow-same-origin lets relative URLs resolve;
        // allow-popups-to-escape-sandbox is intentionally omitted.
        sandbox="allow-same-origin allow-forms"
        onLoad={() => setLoaded(true)}
        onError={() => setError("Could not load this snapshot.")}
        loading="lazy"
      />
    </div>
  );
}
