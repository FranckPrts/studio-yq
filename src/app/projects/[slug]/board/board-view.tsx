"use client";

import { useMemo, type ReactNode } from "react";
import {
  formatScore,
  formatTime,
  latestRun,
  type BoardRow,
  type BoardRun,
} from "@/lib/board";
import {
  FONTS,
  themeCssVars,
  themeScheme,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";
import BoardRowItem from "./board-row";
import ScoreHistogram from "./score-histogram";

/**
 * What the leaderboard looks like, with no idea where its rows come from: the
 * live board feeds it from the tenant's Supabase, the participant-frontend
 * preview feeds it sample rows and unsaved drafts. One view, so the preview
 * cannot drift from the real thing.
 */

export default function BoardView({
  projectName,
  theme,
  lexicon,
  copy,
  rows,
  runs,
  showHistogram = true,
  qr,
  status,
  footer,
}: {
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  /** Null until the first load lands. */
  rows: BoardRow[] | null;
  /**
   * Every run so far, not just each avatar's best — the histogram under the
   * board. Left out, or empty, there is no histogram.
   */
  runs?: readonly BoardRun[];
  /** False hides the histogram; the footer stays pinned on its own. */
  showHistogram?: boolean;
  /**
   * The participation link as a QR code beside the title, so the room can
   * join from the board. Left out, there is none.
   */
  qr?: { src: string; url: string };
  /** Shown in place of the rows while there are none to show yet. */
  status?: string;
  footer?: ReactNode;
}) {
  const t = (key: "boardTitle" | "boardSubtitle" | "boardEmpty") =>
    fillCopy(copy[key], {
      noun: lexicon.noun,
      nounPlural: lexicon.nounPlural,
      project: projectName,
    });
  // An avatar saved with a blank name, or one no longer in the list.
  const unnamed = `unnamed ${lexicon.noun}`;

  const scores = useMemo(() => runs?.map((r) => r.score) ?? [], [runs]);
  const latest = useMemo(() => (runs ? latestRun(runs) : null), [runs]);
  const histogram = showHistogram ? latest : null;

  return (
    <div
      data-theme={themeScheme(theme)}
      style={{
        ...themeCssVars(theme),
        backgroundColor: theme.void,
        color: theme.paper,
        fontFamily: FONTS[theme.font].stack,
      }}
      className="min-h-dvh"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 pt-10">
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl">{t("boardTitle")}</h1>
            <p className="mt-2 max-w-[46ch] whitespace-pre-line text-sm leading-relaxed text-dim">
              {t("boardSubtitle")}
            </p>
          </div>
          {/* rem-sized, so the console's text-size control grows it too. The
              image brings its own white quiet zone, on any theme. */}
          {qr && (
            <figure className="flex w-32 shrink-0 flex-col items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG from our own route, already sized */}
              <img
                src={qr.src}
                alt={`QR code for ${qr.url}`}
                className="aspect-square w-full rounded"
              />
              <figcaption className="break-all text-center text-[11px] text-dim">
                {qr.url.replace(/^https?:\/\//, "")}
              </figcaption>
            </figure>
          )}
        </header>

        <section className="mt-12">
          <div className="flex items-baseline gap-3 pb-3 text-xs text-dim">
            <span aria-hidden className="w-[2ch] shrink-0" />
            <span className="min-w-0 flex-1">pair</span>
            <span className="w-[5ch] shrink-0 text-right">score</span>
          </div>

          {rows === null ? (
            <>
              <div aria-hidden className="term-rule text-dim/40" />
              <p className="py-6 text-sm text-dim">{status ?? "loading…"}</p>
            </>
          ) : rows.length === 0 ? (
            <>
              <div aria-hidden className="term-rule text-dim/40" />
              <p className="max-w-[40ch] whitespace-pre-line py-6 text-sm leading-relaxed text-dim">
                {t("boardEmpty")}
              </p>
            </>
          ) : (
            <ul>
              {rows.map((row) => (
                <BoardRowItem key={row.id} row={row} unnamed={unnamed} />
              ))}
            </ul>
          )}
          <div aria-hidden className="term-rule text-dim/40" />
        </section>

        {/* Pinned to the bottom of the screen while the rows scroll under it,
            so the room always sees the distribution; with few rows, `mt-auto`
            still sets it at the bottom. Void-filled, with a fade above, so a
            row passing beneath goes out of sight rather than through it. */}
        {(histogram || footer) && (
          <div className="sticky bottom-0 z-10 mt-auto bg-void pb-6 pt-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-linear-to-b from-transparent to-void"
            />
            {histogram && (
              <section>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs tabular-nums text-dim">
                  <p>fig. 1 — every run so far · n={scores.length}</p>
                  <p>
                    dotted line: latest · {formatTime(histogram.recordedAt)} ·{" "}
                    {formatScore(histogram.score)}
                  </p>
                </div>
                <ScoreHistogram scores={scores} latest={histogram.score} />
              </section>
            )}
            {footer && (
              <footer className="mt-3 flex items-baseline justify-between gap-4 text-[11px] text-dim">
                {footer}
              </footer>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
