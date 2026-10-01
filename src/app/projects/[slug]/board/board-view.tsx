"use client";

import type { ReactNode } from "react";
import {
  formatRank,
  formatScore,
  formatTime,
  type BoardRow,
} from "@/lib/board";
import {
  FONTS,
  themeCssVars,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";

/**
 * What the leaderboard looks like, with no idea where its rows come from: the
 * live board feeds it from the tenant's Supabase, the participant-frontend
 * preview feeds it sample rows and unsaved drafts. One view, so the preview
 * cannot drift from the real thing.
 */

/** Rank column plus the row gap — sub-lines hang off the same left rail. */
const RAIL = "pl-[calc(2ch+0.75rem)]";

function Row({ row, unnamed }: { row: BoardRow; unnamed: string }) {
  const [a, b] = row.names;
  return (
    <li>
      <div aria-hidden className="term-rule text-dim/40" />
      <div className="py-5">
        <div className="flex items-baseline gap-3">
          <span className="w-[2ch] shrink-0 text-sm tabular-nums text-dim">
            {formatRank(row.rank)}
          </span>
          <p className="min-w-0 flex-1 text-lg leading-snug">
            {a || unnamed}
            <span className="px-2 text-dim">/</span>
            {b || unnamed}
          </p>
          {/* Margin, not padding — `w-[5ch]` is border-box and `100.0` needs it all. */}
          <span className="ml-1 w-[5ch] shrink-0 text-right text-xl tabular-nums">
            {formatScore(row.score)}
          </span>
        </div>
        <div className={`mt-1.5 ${RAIL}`}>
          <p className="text-xs tabular-nums text-dim">
            {formatTime(row.recordedAt)}
          </p>
          {row.strategy && (
            <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-dim">
              {row.strategy}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function BoardView({
  projectName,
  theme,
  lexicon,
  copy,
  rows,
  status,
  footer,
}: {
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  /** Null until the first load lands. */
  rows: BoardRow[] | null;
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

  return (
    <div
      style={{
        ...themeCssVars(theme),
        backgroundColor: theme.void,
        color: theme.paper,
        fontFamily: FONTS[theme.font].stack,
      }}
      className="min-h-dvh"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 pb-16 pt-10">
        <header>
          <h1 className="text-2xl">{t("boardTitle")}</h1>
          <p className="mt-2 max-w-[46ch] whitespace-pre-line text-sm leading-relaxed text-dim">
            {t("boardSubtitle")}
          </p>
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
                <Row key={row.id} row={row} unnamed={unnamed} />
              ))}
            </ul>
          )}
          <div aria-hidden className="term-rule text-dim/40" />
        </section>

        {footer && (
          <footer className="mt-auto flex items-baseline justify-between gap-4 pt-12 text-[11px] text-dim">
            {footer}
          </footer>
        )}
      </main>
    </div>
  );
}
