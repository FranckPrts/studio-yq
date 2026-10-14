"use client";

import { useEffect, useMemo, useState } from "react";
import { allRuns, type MyRuns } from "@/lib/spoke/results";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import type { ConclusionPage } from "@/lib/report/conclusion-template";
import { useReturning } from "../use-returning";
import ConclusionView from "./conclusion-view";

/** The board's poll: the conclusion keeps filling in while the event runs. */
const POLL_MS = 10_000;

const NO_AVATARS: ReadonlySet<string> = new Set();
const NO_NAMES: ReadonlyMap<string, string> = new Map();

export default function Conclusion({
  slug,
  projectName,
  theme,
  lexicon,
  copy,
  conclusion,
  supabaseUrl,
  publishableKey,
}: {
  slug: string;
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  conclusion: ConclusionPage;
  supabaseUrl: string;
  publishableKey: string;
}) {
  const who = useReturning(supabaseUrl, publishableKey);
  const [runs, setRuns] = useState<MyRuns | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Everyone's runs, whoever is reading: a device with no avatar still gets
  // the conclusion, just with nothing of its own marked.
  const client = who.status === "loading" ? null : who.client;
  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    const load = async () => {
      try {
        const next = await allRuns(client);
        if (cancelled) return;
        setRuns(next);
        setError(null);
      } catch (e) {
        console.warn("[spoke] conclusion read failed:", e);
        if (!cancelled) setError("Couldn’t load the conclusion. Trying again…");
      }
    };

    void load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [client]);

  const mine = useMemo(
    () => (who.status === "ready" ? new Set(who.avatarIds) : NO_AVATARS),
    [who],
  );

  return (
    <ConclusionView
      projectName={projectName}
      theme={theme}
      lexicon={lexicon}
      copy={copy}
      conclusion={conclusion}
      nav={{ slug }}
      scores={runs?.scores ?? null}
      names={runs?.names ?? NO_NAMES}
      mine={mine}
      hasAvatar={who.status === "ready"}
      status={error ?? undefined}
    />
  );
}
