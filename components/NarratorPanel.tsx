"use client";

import { useEffect, useCallback } from "react";
import { useCompletion } from "ai/react";
import type { FeatureDiff } from "@/lib/diff/diff-features";

interface NarratorPanelProps {
  domain: string;
  diff: FeatureDiff;
}

/**
 * Streams a spooky AI-generated narrative from /api/narrate.
 *
 * The parent keys this component by `fromYear-toYear` so it re-mounts
 * (and re-narrates) every time the diff changes. No stale state.
 * An in-flight stream is cancelled automatically when the component unmounts.
 */
export default function NarratorPanel({ domain, diff }: NarratorPanelProps) {
  const { completion, isLoading, error, complete, stop } = useCompletion({
    api: "/api/narrate",
  });

  const fetchNarration = useCallback(async () => {
    await complete("", {
      body: { diff, domain },
    });
  }, [complete, diff, domain]);

  // Auto-trigger on mount; stop any in-flight stream on unmount
  useEffect(() => {
    fetchNarration();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside
      className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-3"
      aria-label="AI narrator"
      aria-live="polite"
    >
      <header className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">🕯️</span>
        <h2 className="text-sm font-semibold text-pumpkin tracking-wide uppercase">
          The Narrator Speaks
        </h2>
      </header>

      <div className="text-sm text-gray-200 leading-relaxed min-h-[4rem]">
        {isLoading && !completion && (
          <span className="text-gray-500 italic animate-pulse">
            The spirits are gathering…
          </span>
        )}

        {error && (
          <span className="text-red-400 text-xs">
            The narrator fell silent. ({error.message})
          </span>
        )}

        {completion && (
          <p>{completion}</p>
        )}
      </div>

      {!isLoading && completion && (
        <button
          onClick={fetchNarration}
          className="text-xs text-gray-500 hover:text-pumpkin transition-colors underline underline-offset-2"
        >
          Tell it again
        </button>
      )}
    </aside>
  );
}
