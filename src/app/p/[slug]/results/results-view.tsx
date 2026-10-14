"use client";

import type { BoardRow } from "@/lib/board";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import { fillCopy, type CopyKey, type ProjectCopy } from "@/lib/theme/project-copy";
import BoardRowItem from "@/app/projects/[slug]/board/board-row";
import PageShell from "../page-shell";
import { NavLink, type Nav } from "../nav";

/**
 * A participant's results, with no idea where the rows come from: the page
 * reads them from the tenant's Supabase, the participant-frontend preview
 * hands it made-up ones. One view, so the preview cannot drift.
 */
export default function ResultsView({
  projectName,
  theme,
  lexicon,
  copy,
  nav,
  conclusionOpen,
  rows,
  noAvatar = false,
  status,
}: {
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  nav: Nav;
  /** Whether the conclusion is published, and so linked to. */
  conclusionOpen: boolean;
  /** Null until the first load lands. */
  rows: BoardRow[] | null;
  /** This browser has made nothing here, so there is nothing to read. */
  noAvatar?: boolean;
  /** Shown in place of the rows while there are none to show yet. */
  status?: string;
}) {
  const t = (key: CopyKey) =>
    fillCopy(copy[key], {
      noun: lexicon.noun,
      nounPlural: lexicon.nounPlural,
      project: projectName,
    });
  // An avatar saved with a blank name, or one no longer in the list.
  const unnamed = `unnamed ${lexicon.noun}`;

  return (
    <PageShell theme={theme}>
      <header className="flex flex-col gap-2">
        <h1 className="text-sm">{t("resultsTitle")}</h1>
        {!noAvatar && (
          <p className="whitespace-pre-line text-xs leading-relaxed text-dim">
            {t("resultsBody")}
          </p>
        )}
      </header>

      {noAvatar ? (
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-[40ch] whitespace-pre-line text-xs leading-relaxed text-dim">
            {t("noAvatarMessage")}
          </p>
          <NavLink nav={nav} to="home" className="text-sm underline underline-offset-4">
            {t("newButton")}
          </NavLink>
        </div>
      ) : (
        <div>
          {rows && rows.length > 0 ? (
            <ul>
              {rows.map((row) => (
                <BoardRowItem key={row.id} row={row} unnamed={unnamed} compact />
              ))}
            </ul>
          ) : (
            <>
              <div aria-hidden className="term-rule text-dim/40" />
              <p className="whitespace-pre-line py-4 text-xs leading-relaxed text-dim">
                {rows ? t("resultsEmpty") : (status ?? "loading…")}
              </p>
            </>
          )}
          <div aria-hidden className="term-rule text-dim/40" />
        </div>
      )}

      <div className="flex flex-col items-start gap-3">
        {conclusionOpen && (
          <NavLink nav={nav} to="conclusion" className="text-sm underline underline-offset-4">
            {t("conclusionButton")}
          </NavLink>
        )}
        {!noAvatar && (
          <NavLink
            nav={nav}
            to="home"
            className="text-xs text-dim underline-offset-4 hover:underline"
          >
            {t("backButton")}
          </NavLink>
        )}
      </div>
    </PageShell>
  );
}
