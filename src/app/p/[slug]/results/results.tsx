"use client";

import { useEffect, useMemo, useState } from "react";
import { buildOwnBoard } from "@/lib/board";
import { myRuns, type MyRuns } from "@/lib/spoke/results";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import { useReturning } from "../use-returning";
import ResultsView from "./results-view";

/**
 * Scores land once a run, minutes apart, and are not in the realtime
 * publication — the board's ten-second poll.
 */
const POLL_MS = 10_000;

export default function Results({
  slug,
  projectName,
  theme,
  lexicon,
  copy,
  supabaseUrl,
  publishableKey,
  conclusionOpen,
}: {
  slug: string;
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  supabaseUrl: string;
  publishableKey: string;
  conclusionOpen: boolean;
}) {
  const who = useReturning(supabaseUrl, publishableKey);
  const [runs, setRuns] = useState<MyRuns | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (who.status !== "ready") return;
    const { client, avatarIds } = who;
    let cancelled = false;

    const load = async () => {
      try {
        const next = await myRuns(client, avatarIds);
        if (cancelled) return;
        setRuns(next);
        setError(null);
      } catch (e) {
        // Keep showing the last good runs. The real message is for whoever is
        // debugging; the participant gets a sentence.
        console.warn("[spoke] results read failed:", e);
        if (!cancelled) setError("Couldn’t load results. Trying again…");
      }
    };

    void load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [who]);

  const rows = useMemo(
    () =>
      runs && who.status === "ready"
        ? buildOwnBoard(runs.scores, runs.names, new Set(who.avatarIds))
        : null,
    [runs, who],
  );

  return (
    <ResultsView
      projectName={projectName}
      theme={theme}
      lexicon={lexicon}
      copy={copy}
      nav={{ slug }}
      conclusionOpen={conclusionOpen}
      rows={rows}
      noAvatar={who.status === "none"}
      status={
        who.status === "error"
          ? "Couldn’t load your results. Try reloading the page."
          : (error ?? undefined)
      }
    />
  );
}
