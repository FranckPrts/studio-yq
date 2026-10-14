"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { buildBoard, type BoardRun, type BoardScore } from "@/lib/board";
import { allRuns } from "@/lib/spoke/results";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import BoardView from "./board-view";

/**
 * Scores arrive once a run, minutes apart, and are not in the realtime
 * publication (tenant schema v2) — the same ten-second poll as the console.
 * Names are re-read with them, so a renamed avatar catches up too.
 */
const POLL_MS = 10_000;

/** Whoever runs the screen toggles the histogram with this key. */
const HISTOGRAM_KEY = "h";

export default function Board({
  slug,
  projectName,
  theme,
  lexicon,
  copy,
  projectUrl,
  publishableKey,
}: {
  slug: string;
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  projectUrl: string;
  publishableKey: string;
}) {
  const [scores, setScores] = useState<BoardScore[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [showHistogram, setShowHistogram] = useState(true);

  useEffect(() => {
    // No persisted session: a screen showing the board must not take out an
    // anonymous participant identity. Both tables are readable to the key.
    const client = createClient(projectUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let cancelled = false;

    async function load() {
      try {
        const next = await allRuns(client);
        if (cancelled) return;
        setError(null);
        setScores(next.scores);
        setNames(next.names);
      } catch (e) {
        // Keep showing the last good board; say so quietly underneath.
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    void load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [projectUrl, publishableKey]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // A bare `h` only: Cmd+H hides the browser on a Mac, and a held key
      // shouldn't strobe the chart.
      if (e.key.toLowerCase() !== HISTOGRAM_KEY) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (
        e.target instanceof Element &&
        e.target.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }
      setShowHistogram((shown) => !shown);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const rows = useMemo(
    () => (scores ? buildBoard(scores, names) : null),
    [scores, names],
  );
  // Every run, not just the board's: the histogram fills in over the event.
  const runs = useMemo<BoardRun[] | undefined>(
    () =>
      scores?.map((s) => ({ score: Number(s.score), recordedAt: s.recorded_at })),
    [scores],
  );
  return (
    <BoardView
      projectName={projectName}
      theme={theme}
      lexicon={lexicon}
      copy={copy}
      rows={rows}
      runs={runs}
      showHistogram={showHistogram}
      status={error ?? undefined}
      footer={
        <>
          <span>{rows !== null && error ? `not updating: ${error}` : ""}</span>
          {/* For whoever is running the screen; faint enough to ignore. */}
          <span className="flex items-baseline gap-4">
            {runs && runs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistogram((shown) => !shown)}
                aria-pressed={showHistogram}
                aria-keyshortcuts={HISTOGRAM_KEY}
                className="opacity-40 underline-offset-4 hover:underline hover:opacity-100"
              >
                [{HISTOGRAM_KEY}] {showHistogram ? "hide" : "show"} histogram
              </button>
            )}
            <Link
              href={`/projects/${slug}/console`}
              className="opacity-40 underline-offset-4 hover:underline hover:opacity-100"
            >
              console
            </Link>
          </span>
        </>
      }
    />
  );
}
