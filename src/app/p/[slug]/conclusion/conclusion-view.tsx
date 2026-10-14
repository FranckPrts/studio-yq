"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import {
  buildBoard,
  conclusionStats,
  formatScore,
  type BoardScore,
} from "@/lib/board";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import { fillCopy, type CopyKey, type ProjectCopy } from "@/lib/theme/project-copy";
import {
  CONCLUSION_BLOCKS,
  conclusionValues,
  type ConclusionBlock,
  type ConclusionPage,
} from "@/lib/report/conclusion-template";
import {
  applyConditionals,
  parseBlocks,
  parseInline,
  type Block,
  type Inline,
} from "@/lib/report/markup";
import BoardRowItem from "@/app/projects/[slug]/board/board-row";
import ScoreHistogram from "@/app/projects/[slug]/board/score-histogram";
import PageShell from "../page-shell";
import { NavLink, type Nav } from "../nav";

/** As many as the CCN conclusion's "who did best" showed. */
const TOP_ROWS = 5;

/**
 * The CCN conclusion, per project, laid out by the tenant's template: their
 * words around every run's score as a histogram with the participant's own
 * marked, a few figures, and who did best. Fed by the page from the tenant's
 * Supabase, or by the preview with made-up runs.
 *
 * Until there is a run to show — still loading, or nothing scored yet — the
 * first figure block holds the waiting message and the others are left out,
 * so the tenant's heading and introduction read the same either way.
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
  conclusion,
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
  conclusion: ConclusionPage;
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
  const vars = {
    noun: lexicon.noun,
    nounPlural: lexicon.nounPlural,
    project: projectName,
  };
  const t = (key: CopyKey) => fillCopy(copy[key], vars);
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
  const { values, played } = useMemo(
    () => conclusionValues(scores ?? [], names, mine, vars),
    // `vars` is rebuilt every render from these three.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scores, names, mine, lexicon.noun, lexicon.nounPlural, projectName],
  );
  const blocks = useMemo(
    () =>
      parseBlocks(applyConditionals(conclusion.body, played), {
        blocks: CONCLUSION_BLOCKS,
        headings: true,
      }),
    [conclusion.body, played],
  );

  const mark =
    !stats || stats.mine.length === 0
      ? hasAvatar
        ? `none of your ${lexicon.nounPlural} have a scored run yet — dotted lines mark them once they do`
        : `no ${lexicon.noun} on this device — dotted lines would mark its runs`
      : `dotted ${stats.mine.length === 1 ? "line" : "lines"}: your ${stats.mine.length} ${stats.mine.length === 1 ? "run" : "runs"}`;

  const waiting = stats === null || stats.runs === 0;
  const firstFigure = blocks.findIndex((b) => b.kind === "block");

  function figure(name: ConclusionBlock, index: number): ReactNode {
    if (waiting) {
      if (index !== firstFigure) return null;
      return (
        <div>
          <div aria-hidden className="term-rule text-dim/40" />
          <p className="whitespace-pre-line py-4 text-xs leading-relaxed text-dim">
            {stats ? fillCopy(conclusion.empty, vars) : (status ?? "loading…")}
          </p>
          <div aria-hidden className="term-rule text-dim/40" />
        </div>
      );
    }
    if (name === "histogram") {
      return (
        <section className="flex flex-col gap-3">
          <p className="text-xs tabular-nums text-dim">
            every run · n={stats.runs} · {stats.avatars}{" "}
            {stats.avatars === 1 ? lexicon.noun : lexicon.nounPlural}
          </p>
          <ScoreHistogram
            scores={all}
            marks={stats.mine}
            label="Score histogram of every run, with yours marked"
          />
          <p className="max-w-[46ch] text-xs leading-relaxed text-dim">{mark}</p>
        </section>
      );
    }
    if (name === "figures") {
      return (
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
      );
    }
    return (
      <section>
        <ul>
          {top.map((row) => (
            <BoardRowItem key={row.id} row={row} unnamed={unnamed} compact />
          ))}
        </ul>
        <div aria-hidden className="term-rule text-dim/40" />
      </section>
    );
  }

  const nodes = blocks.map((block, i) =>
    block.kind === "block" ? figure(block.name, i) : <Prose key={i} block={block} values={values} />,
  );
  // A heading goes with the figure under it: "who did best" over nothing
  // would read as a mistake.
  const rendered = blocks
    .map((block, i) => ({ block, node: nodes[i] }))
    .filter(
      ({ block, node }, i) =>
        node !== null &&
        !(block.kind === "heading" && blocks[i + 1]?.kind === "block" && nodes[i + 1] === null),
    );

  return (
    <PageShell theme={theme}>
      <div className="flex flex-col">
        {rendered.map(({ block, node }, i) => (
          <div key={i} className={spacing(rendered[i - 1]?.block, block)}>
            {node}
          </div>
        ))}
      </div>

      {/* Under the figures rather than over them: the last load's error,
          while the last good figures stay on screen. */}
      {!waiting && status && (
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

/**
 * The gap above a block: tight under a heading, wide before a figure or a new
 * heading, a paragraph's worth between words.
 */
function spacing(prev: Block | undefined, block: Block): string {
  if (!prev) return "";
  if (prev.kind === "heading") return "mt-3";
  if (block.kind === "heading" || block.kind === "block") return "mt-8";
  return prev.kind === "block" ? "mt-6" : "mt-4";
}

function Prose({
  block,
  values,
}: {
  block: Exclude<Block, { kind: "block" }>;
  values: Record<string, string>;
}) {
  const line = (raw: string) => <InlineNodes nodes={parseInline(raw, values)} />;
  if (block.kind === "heading") {
    return block.level === 1 ? (
      <h1 className="text-sm">{line(block.text)}</h1>
    ) : (
      <h2 className="text-xs text-dim">{line(block.text)}</h2>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-dim">
        {block.items.map((item, i) => (
          <li key={i}>{line(item)}</li>
        ))}
      </ul>
    );
  }
  // Line breaks are kept, as in the email: a sign-off typed on two lines
  // should read on two lines.
  const lines = block.lines.map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line(l)}
    </Fragment>
  ));
  return block.kind === "quote" ? (
    <blockquote className="border-l border-dim/60 pl-3 text-xs leading-relaxed text-dim">
      {lines}
    </blockquote>
  ) : (
    <p className="text-xs leading-relaxed text-dim">{lines}</p>
  );
}

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, i) => {
    if (node.type === "text") return <Fragment key={i}>{node.value}</Fragment>;
    if (node.type === "strong" || node.type === "em") {
      const Tag = node.type;
      return (
        <Tag key={i} className={Tag === "strong" ? "font-semibold text-paper" : undefined}>
          <InlineNodes nodes={node.children} />
        </Tag>
      );
    }
    // Only http(s) and mailto reach an href — `parseInline` makes no other.
    return (
      <a
        key={i}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-paper underline underline-offset-4"
      >
        <InlineNodes nodes={node.children} />
      </a>
    );
  });
}

function Figure({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-dim">{term}</dt>
      <dd className="text-base tabular-nums">{value}</dd>
    </div>
  );
}
