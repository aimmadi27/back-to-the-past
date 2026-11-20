"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FeatureDiff } from "@/lib/diff/diff-features";

interface GhostOverlayProps {
  domain: string;
  fromTimestamp: string;
  fromOriginal: string;
  toTimestamp: string;
  toOriginal: string;
  fromYear: number;
  toYear: number;
  onDiffReady: (diff: FeatureDiff) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Fetches the structural diff between two snapshots and renders
 * the "ghost" UI — floating removed elements that fade in and out.
 *
 * Requests are debounced (400ms) and use AbortController so a slow
 * older response can never overwrite a newer one.
 */
export default function GhostOverlay({
  domain,
  fromTimestamp,
  fromOriginal,
  toTimestamp,
  toOriginal,
  fromYear,
  toYear,
  onDiffReady,
}: GhostOverlayProps) {
  const [diff, setDiff] = useState<FeatureDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDiff = useCallback(() => {
    // Comparing a year with itself is meaningless — skip
    if (fromTimestamp === toTimestamp) {
      setDiff(null);
      setError("Select two different years to compare.");
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDiff(null);
    setError(null);
    setLoading(true);

    const params = new URLSearchParams({
      domain,
      from: fromTimestamp,
      to: toTimestamp,
      fromOriginal,
      toOriginal,
    });

    fetch(`/api/diff?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return res.json().then((e: { error?: string }) => Promise.reject(e.error));
        return res.json() as Promise<FeatureDiff>;
      })
      .then((d) => {
        setDiff(d);
        onDiffReady(d);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return; // stale request
        setError(typeof e === "string" ? e : "Failed to compute diff");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [domain, fromTimestamp, fromOriginal, toTimestamp, toOriginal, onDiffReady]);

  useEffect(() => {
    // Debounce — don't fire on every intermediate slider position
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchDiff, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchDiff]);

  if (loading) {
    return (
      <div className="absolute top-4 right-4 z-30 text-xs text-gray-400 animate-pulse">
        Detecting ghosts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 right-4 z-30 text-xs text-red-400 max-w-xs text-right">
        {error}
      </div>
    );
  }

  if (!diff) return null;

  const ghosts = [
    ...diff.removedHeadings.map((h) => ({ label: h, kind: "heading" })),
    ...diff.removedNavLinks.map((l) => ({ label: l, kind: "nav" })),
    ...diff.removedTech.map((t) => ({ label: t, kind: "tech" })),
    ...(diff.flashDied ? [{ label: "Flash intro", kind: "flash" }] : []),
  ];

  if (ghosts.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      aria-label={`Ghosts from ${fromYear} haunting ${toYear}`}
      role="status"
    >
      {ghosts.slice(0, 8).map((ghost, i) => (
        <div
          key={`${ghost.kind}-${i}`}
          className="absolute animate-fade-ghost text-ghost-purple font-spooky"
          style={{
            top: `${10 + i * 11}%`,
            left: `${5 + (i % 3) * 30}%`,
            fontSize: ghost.kind === "heading" ? "1.1rem" : "0.85rem",
            opacity: 0.6,
            animationDelay: `${i * 0.4}s`,
            textShadow: "0 0 12px #8b5cf6",
          }}
          aria-hidden="true"
        >
          👻 {ghost.label}
        </div>
      ))}

      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
        {fromYear} → {toYear} · {ghosts.length} ghost{ghosts.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
