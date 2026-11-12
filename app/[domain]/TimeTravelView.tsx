"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Snapshot } from "@/lib/wayback/cdx";
import type { FeatureDiff } from "@/lib/diff/diff-features";
import TimeSlider from "@/components/TimeSlider";
import SnapshotFrame from "@/components/SnapshotFrame";
import GhostOverlay from "@/components/GhostOverlay";
import NarratorPanel from "@/components/NarratorPanel";

interface TimeTravelViewProps {
  domain: string;
  snapshots: Snapshot[];
}

/**
 * Client component that owns the interactive time-travel UI:
 * - snapshot frame with crossfade (only current + previous mounted)
 * - time slider (debounced 250ms)
 * - ghost overlay (compare mode)
 * - narrator panel
 */
export default function TimeTravelView({ domain, snapshots }: TimeTravelViewProps) {
  // "committed" index is what actually loads an iframe
  const [committedIndex, setCommittedIndex] = useState(snapshots.length - 1);
  // "pending" index tracks the slider position while dragging
  const [pendingIndex, setPendingIndex] = useState(snapshots.length - 1);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [activeDiff, setActiveDiff] = useState<FeatureDiff | null>(null);

  // Debounce: update pending immediately (shows year label), commit after 250ms.
  // When committed index advances in compare mode, also clear the stale diff so
  // the narrator re-narrates — done here in the event handler, not an effect.
  const handleIndexChange = useCallback(
    (index: number) => {
      setPendingIndex(index);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setCommittedIndex((prev) => {
          if (prev !== index) {
            // Year changed while in compare mode — diff is now stale
            setActiveDiff(null);
          }
          setPrevIndex(prev);
          return index;
        });
      }, 250);
    },
    []
  );

  // Clear activeDiff whenever the compare config changes so narration refreshes
  const handleCompareIndexChange = useCallback((index: number | null) => {
    setCompareIndex(index);
    setActiveDiff(null);
  }, []);

  const currentSnapshot = snapshots[committedIndex];
  const compareSnapshot = compareIndex !== null ? snapshots[compareIndex] : null;

  // Determine which indexes to actually mount (current + previous + adjacent only)
  const mountedIndexes = new Set<number>();
  mountedIndexes.add(committedIndex);
  if (prevIndex !== null) mountedIndexes.add(prevIndex);
  if (committedIndex > 0) mountedIndexes.add(committedIndex - 1);
  if (committedIndex < snapshots.length - 1) mountedIndexes.add(committedIndex + 1);

  const handleDiffReady = useCallback((diff: FeatureDiff) => {
    setActiveDiff(diff);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-void">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <Link href="/" className="text-pumpkin text-sm font-semibold hover:text-pumpkin-400 transition-colors">
          ← Back to the Past
        </Link>
        <h1 className="text-bone font-spooky text-lg">
          <span className="text-gray-500">👻</span> {domain}
        </h1>
        {/* Show pendingIndex year while dragging for instant feedback */}
        <span className="text-pumpkin font-bold tabular-nums">{snapshots[pendingIndex].year}</span>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Snapshot viewer */}
        <div className="flex-1 relative" style={{ minHeight: "60vh" }}>
          {/* Only mount frames for current + previous + adjacent — not all years */}
          {snapshots.map((snap, i) =>
            mountedIndexes.has(i) ? (
              <SnapshotFrame
                key={snap.timestamp}
                domain={domain}
                timestamp={snap.timestamp}
                year={snap.year}
                active={i === committedIndex}
              />
            ) : null
          )}

          {/* Ghost overlay — only in compare mode */}
          {compareSnapshot && (
            <GhostOverlay
              domain={domain}
              fromTimestamp={compareSnapshot.timestamp}
              toTimestamp={currentSnapshot.timestamp}
              fromYear={compareSnapshot.year}
              toYear={currentSnapshot.year}
              onDiffReady={handleDiffReady}
            />
          )}
        </div>

        {/* Right sidebar */}
        <aside className="lg:w-80 flex flex-col gap-4 p-4 border-t lg:border-t-0 lg:border-l border-gray-800 bg-gray-950">
          {/* Slider */}
          <section aria-label="Time slider">
            <h2 className="text-xs uppercase tracking-widest text-gray-600 mb-3">
              Travel through time
            </h2>
            <TimeSlider
              snapshots={snapshots}
              currentIndex={pendingIndex}
              compareIndex={compareIndex}
              onIndexChange={handleIndexChange}
              onCompareIndexChange={handleCompareIndexChange}
            />
          </section>

          {/* Snapshot info */}
          <section className="text-xs text-gray-500 space-y-1" aria-label="Snapshot info">
            <p>
              <span className="text-gray-600">Captured:</span>{" "}
              {formatTimestamp(currentSnapshot.timestamp)}
            </p>
            <p>
              <span className="text-gray-600">Archive ID:</span>{" "}
              <a
                href={`https://web.archive.org/web/${currentSnapshot.timestamp}/${currentSnapshot.original}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pumpkin hover:underline"
              >
                {currentSnapshot.timestamp}
              </a>
            </p>
          </section>

          {/* Narrator — keyed by fromYear-toYear so it re-mounts on each new diff */}
          {activeDiff && compareSnapshot && (
            <NarratorPanel
              key={`${compareSnapshot.year}-${currentSnapshot.year}`}
              domain={domain}
              diff={activeDiff}
            />
          )}

          {!compareSnapshot && (
            <div className="text-xs text-gray-600 italic mt-auto text-center pb-2">
              Enable &quot;Compare years&quot; to summon the narrator 👻
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const month = ts.slice(4, 6);
  const day = ts.slice(6, 8);
  const year = ts.slice(0, 4);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
}
