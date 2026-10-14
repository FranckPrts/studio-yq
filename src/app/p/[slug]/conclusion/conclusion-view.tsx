"use client";

import { useMemo } from "react";
import {
  buildBoard,
  conclusionStats,
  formatScore,
  type BoardScore,
} from "@/lib/board";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import { fillCopy, type CopyKey, type ProjectCopy } from "@/lib/theme/project-copy";
import BoardRowItem from "@/app/projects/[slug]/board/board-row";
import ScoreHistogram from "@/app/projects/[slug]/board/score-histogram";
import PageShell from "../page-shell";
import { NavLink, type Nav } from "../nav";

/** As many as the CCN conclusion's "who did best" showed. */
const TOP_ROWS = 5;

/**
 * The CCN conclusion, per project: every run's score as a histogram with the
 * participant's own marked, a few figures, and who did best. Fed by the page
 * from the tenant's Supabase, or by the preview with made-up runs.
 *
 * The CCN plate also grouped runs by a hand-coded strategy category; nothing
 * records that category any more, so strategies appear only as written, under
 * the best runs.
 */
export default function ConclusionView({
  projectName,
  theme,
  lexicon,
  copy,
  nav,
  scores,
  names,
  mine,
  hasAvatar,
  status,
}: {
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  nav: Nav;
  /** Every run in the experience; null until the first load lands. */
  scores: BoardScore[] | null;
  names: ReadonlyMap<string, string>;
  /** This browser's avatars — their runs are the ones marked. */
  mine: ReadonlySet<string>;
  /** False when this browser has made nothing here: no marks, and no results. */
  hasAvatar: boolean;
  status?: string;
}) {
  const t = (key: CopyKey) =>
    fillCopy(copy[key], {
      noun: lexicon.noun,
      nounPlural: lexicon.nounPlural,
      project: projectName,
    });
  const unnamed = `unnamed ${lexicon.noun}`;

  const all = useMemo(
    () => scores?.map((s) => Number(s.score)) ?? [],
    [scores],
  );
  const stats = useMemo(
    () => (scores ? conclusionStats(scores, mine) : null),
    [scores, mine],
  );
  const top = useMemo(
    () => (scores ? buildBoard(scores, names).slice(0, TOP_ROWS) : []),
    [scores, names],
  );

  const mark =
    !stats || stats.mine.length === 0
      ? hasAvatar
        ? `none of your ${lexicon.nounPlural} have a scored run yet — dotted lines mark them once they do`
        : `no ${lexicon.noun} on this device — dotted lines would mark its runs`
      : `dotted ${stats.mine.length === 1 ? "line" : "lines"}: your ${stats.mine.length} ${stats.mine.length === 1 ? "run" : "runs"}`;

  return (
    <PageShell theme={theme}>
      <header className="flex flex-col gap-2">
        <h1 className="text-sm">{t("conclusionTitle")}</h1>
        <p className="whitespace-pre-line text-xs leading-relaxed text-dim">
          {t("conclusionBody")}
        </p>
      </header>

      {stats === null || stats.runs === 0 ? (
        <div>
          <div aria-hidden className="term-rule text-dim/40" />
          <p className="whitespace-pre-line py-4 text-xs leading-relaxed text-dim">
            {stats ? t("conclusionEmpty") : (status ?? "loading…")}
          </p>
          <div aria-hidden className="term-rule text-dim/40" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <p className="text-xs tabular-nums text-dim">
              fig. 1 — every run · n={stats.runs} · {stats.avatars}{" "}
              {stats.avatars === 1 ? lexicon.noun : lexicon.nounPlural}
            </p>
            <ScoreHistogram
              scores={all}
              marks={stats.mine}
              label="Score histogram of every run, with yours marked"
            />
            <p className="max-w-[46ch] text-xs leading-relaxed text-dim">{mark}</p>
          </section>

          <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs sm:grid-cols-4">
            <Figure term="runs" value={String(stats.runs)} />
            <Figure term="median" value={stats.median === null ? "--" : formatScore(stats.median)} />
            <Figure term="best" value={stats.best === null ? "--" : formatScore(stats.best)} />
            {hasAvatar && (
              <Figure
                term="your best"
                value={stats.myBest === null ? "--" : formatScore(stats.myBest)}
              />
            )}
          </dl>
          {stats.beaten !== null && stats.myBest !== null && (
            <p className="max-w-[46ch] text-xs leading-relaxed text-dim">
              Your best run scored higher than {Math.round(stats.beaten * 100)}%
              of all runs.
            </p>
          )}
          </div>

          <section>
            <h2 className="pb-3 text-xs text-dim">{t("conclusionTop")}</h2>
            <ul>
              {top.map((row) => (
                <BoardRowItem key={row.id} row={row} unnamed={unnamed} compact />
              ))}
            </ul>
            <div aria-hidden className="term-rule text-dim/40" />
          </section>
        </>
      )}

      {/* Under the figures rather than over them: the last load's error,
          while the last good figures stay on screen. */}
      {stats !== null && status && (
        <p className="text-[11px] text-dim">{status}</p>
      )}

      <div className="flex flex-col items-start gap-3">
        {hasAvatar && (
          <NavLink nav={nav} to="results" className="text-sm underline underline-offset-4">
            {t("resultsButton")}
          </NavLink>
        )}
        <NavLink
          nav={nav}
          to="home"
          className="text-xs text-dim underline-offset-4 hover:underline"
        >
          {t("backButton")}
        </NavLink>
      </div>
    </PageShell>
  );
}

function Figure({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-dim">{term}</dt>
      <dd className="text-base tabular-nums">{value}</dd>
    </div>
  );
}
