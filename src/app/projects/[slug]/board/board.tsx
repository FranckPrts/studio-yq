"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { buildBoard, type BoardRun, type BoardScore } from "@/lib/board";
import { useBoardDisplay } from "@/lib/board-display";
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
  // Set from the live console, shared through this browser's storage — see
  // lib/board-display. The board itself carries no controls.
  const [display] = useBoardDisplay(slug);
  const { showHistogram, scale } = display;

  // Scale by the root font size, on this page only: every rem-based size
  // follows, and it is put back when leaving for the console.
  useEffect(() => {
    if (scale === 1) return;
    const root = document.documentElement;
    const before = root.style.fontSize;
    root.style.fontSize = `${scale * 100}%`;
    return () => {
      root.style.fontSize = before;
    };
  }, [scale]);

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

  const rows = useMemo(
    () => (scores ? buildBoard(scores, names) : null),
    [scores, names],
  );
  // Every run, not just the board's: the histogram fills in over the event.
  const runs = useMemo<BoardRun[] | undefined>(
    () =>
      scores?.map((s) => ({
        score: Number(s.score),
        recordedAt: s.recorded_at,
      })),
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
        rows !== null && error ? <span>not updating: {error}</span> : undefined
      }
    />
  );
}
