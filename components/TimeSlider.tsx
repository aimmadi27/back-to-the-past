"use client";

import { useCallback } from "react";
import type { Snapshot } from "@/lib/wayback/cdx";

interface TimeSliderProps {
  snapshots: Snapshot[];
  currentIndex: number;
  compareIndex: number | null;
  onIndexChange: (index: number) => void;
  onCompareIndexChange: (index: number | null) => void;
}

/**
 * A dual-handle slider that lets users scrub through snapshot years.
 * The primary handle picks the "current" snapshot; an optional compare
 * handle picks the "from" snapshot for the ghost diff.
 */
export default function TimeSlider({
  snapshots,
  currentIndex,
  compareIndex,
  onIndexChange,
  onCompareIndexChange,
}: TimeSliderProps) {
  const handleMainChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onIndexChange(parseInt(e.target.value, 10));
    },
    [onIndexChange]
  );

  const handleCompareToggle = useCallback(() => {
    if (compareIndex !== null) {
      onCompareIndexChange(null);
    } else {
      // Default compare point: one before current, or 0
      onCompareIndexChange(Math.max(0, currentIndex - 1));
    }
  }, [compareIndex, currentIndex, onCompareIndexChange]);

  const handleCompareChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCompareIndexChange(parseInt(e.target.value, 10));
    },
    [onCompareIndexChange]
  );

  if (snapshots.length === 0) return null;

  // Single snapshot — no slider needed
  if (snapshots.length === 1) {
    return (
      <div className="w-full px-2 py-2 text-sm text-gray-400 text-center">
        Only one snapshot available:{" "}
        <span className="text-pumpkin font-semibold">{snapshots[0].year}</span>
      </div>
    );
  }

  const currentSnapshot = snapshots[currentIndex];
  const compareSnapshot = compareIndex !== null ? snapshots[compareIndex] : null;
  const rangeMax = snapshots.length - 1;
  const pct = (currentIndex / rangeMax) * 100;

  return (
    <div className="w-full space-y-4 px-2">
      {/* Year labels */}
      <div className="flex justify-between text-xs text-gray-500 select-none">
        <span>{snapshots[0].year}</span>
        <span className="text-pumpkin font-semibold text-sm">
          {currentSnapshot.year}
        </span>
        <span>{snapshots[rangeMax].year}</span>
      </div>

      {/* Main slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={rangeMax}
          value={currentIndex}
          onChange={handleMainChange}
          className="w-full h-2 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${pct}%, #374151 ${pct}%, #374151 100%)`,
          }}
          aria-label={`Select year: ${currentSnapshot.year}`}
          aria-valuemin={snapshots[0].year}
          aria-valuemax={snapshots[rangeMax].year}
          aria-valuenow={currentSnapshot.year}
        />
      </div>

      {/* Year tick marks */}
      <div className="flex justify-between">
        {snapshots.map((snap, i) => (
          <button
            key={snap.timestamp}
            onClick={() => onIndexChange(i)}
            className={`text-xs transition-colors ${
              i === currentIndex
                ? "text-pumpkin font-bold"
                : i === compareIndex
                ? "text-ghost-purple font-bold"
                : "text-gray-600 hover:text-gray-400"
            }`}
            aria-label={`Jump to ${snap.year}`}
            aria-pressed={i === currentIndex}
          >
            {snap.year}
          </button>
        ))}
      </div>

      {/* Compare mode */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleCompareToggle}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            compareIndex !== null
              ? "bg-ghost-500 border-ghost-400 text-white"
              : "border-gray-600 text-gray-400 hover:border-gray-400"
          }`}
          aria-pressed={compareIndex !== null}
        >
          {compareIndex !== null ? "👻 Comparing" : "Compare years"}
        </button>

        {compareIndex !== null && compareSnapshot && (
          <span className="text-xs text-ghost-purple">
            {compareSnapshot.year} → {currentSnapshot.year}
          </span>
        )}
      </div>

      {/* Compare slider */}
      {compareIndex !== null && (
        <div className="relative">
          <label className="text-xs text-gray-500 mb-1 block">
            Compare from: {compareSnapshot?.year}
          </label>
          <input
            type="range"
            min={0}
            max={rangeMax}
            value={compareIndex}
            onChange={handleCompareChange}
            className="w-full h-2 appearance-none rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${
                (compareIndex / rangeMax) * 100
              }%, #374151 ${
                (compareIndex / rangeMax) * 100
              }%, #374151 100%)`,
            }}
            aria-label={`Select compare year: ${compareSnapshot?.year}`}
          />
        </div>
      )}
    </div>
  );
}
