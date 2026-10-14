import { conclusionStats, formatScore, type BoardScore } from "@/lib/board";
import { cleanTemplate } from "./markup";
import { joinNames, ordinal, percentileOf } from "./people";

/**
 * The conclusion page (/p/[slug]/conclusion), as the tenant writes it: the
 * same light markdown as the report email (see `markup.ts`), plus "# " and
 * "## " headings, with blocks for the figures — {histogram}, {figures} and
 * {top} — where the email has pictures.
 *
 * Read by whoever opens the link, so "you" is whoever's browser made avatars
 * here: their runs are the ones marked, and {#runs} is for them. A visitor
 * with none reads {#noruns}.
 *
 * Plus the two sentences shown around it: before anyone has scored, and before
 * it is published. Plain text, like the rest of the participant copy.
 */

export type ConclusionPage = {
  body: string;
  /** In place of the figures, until the first run is scored. */
  empty: string;
  /** The whole page, until it is published. */
  pending: string;
};

export const CONCLUSION_LIMITS = { body: 10_000, empty: 400, pending: 400 } as const;

export const CONCLUSION_BLOCKS = ["histogram", "figures", "top"] as const;
export type ConclusionBlock = (typeof CONCLUSION_BLOCKS)[number];

export const CONCLUSION_BLOCK_DESCRIPTIONS: Record<ConclusionBlock, string> = {
  histogram: "Every run's score, with the reader's marked",
  figures: "Runs, median, best — and theirs, if they made one",
  top: "The best runs, with who played them",
};

/**
 * Kept word for word in the migration that carried each project's old
 * conclusion wording into a template (`…_conclusion_page`): a project whose
 * wording was never changed reads this.
 */
export const DEFAULT_CONCLUSION_PAGE: ConclusionPage = {
  body: `# Conclusion

Every run across {project}, and where yours landed among them.

{histogram}

{figures}

{#runs}
Your best run scored {best_score}, in the {percentile} percentile of every run.
{/runs}

## who did best

{top}`,
  empty: "No runs have been recorded yet. The conclusion fills in as pairs take part.",
  pending: "The conclusion isn’t out yet. It appears here once the experience is over.",
};

export const CONCLUSION_PLACEHOLDERS: { key: string; description: string }[] = [
  { key: "noun", description: "What participants make" },
  { key: "nounPlural", description: "…in the plural" },
  { key: "project", description: "The project's name" },
  { key: "total_runs", description: "How many runs everyone played" },
  { key: "total_avatars", description: "How many took part in a run" },
  { key: "median", description: "The median score of every run" },
  { key: "top_score", description: "The best score of every run" },
  { key: "name", description: "The reader's avatar's name — several joined with “and”" },
  { key: "runs", description: "How many runs the reader's played" },
  { key: "best_score", description: "The reader's best score" },
  { key: "percentile", description: "Where the reader's best falls among every run, e.g. 79th" },
];

/** Normalize-on-read. Anything blank falls back to its default. */
export function coerceConclusionPage(value: unknown): ConclusionPage {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    body: cleanTemplate(raw.body, CONCLUSION_LIMITS.body) || DEFAULT_CONCLUSION_PAGE.body,
    empty: cleanTemplate(raw.empty, CONCLUSION_LIMITS.empty) || DEFAULT_CONCLUSION_PAGE.empty,
    pending:
      cleanTemplate(raw.pending, CONCLUSION_LIMITS.pending) || DEFAULT_CONCLUSION_PAGE.pending,
  };
}

/**
 * What the {placeholders} become for one reader, and whether they played.
 * Empty where there is nothing to say, so a sentence about their score belongs
 * inside {#runs}…{/runs}.
 */
export function conclusionValues(
  scores: readonly BoardScore[],
  names: ReadonlyMap<string, string>,
  mine: ReadonlySet<string>,
  context: { project: string; noun: string; nounPlural: string },
): { values: Record<string, string>; played: boolean } {
  const stats = conclusionStats(scores, mine);
  const all = scores.map((s) => Number(s.score)).filter(Number.isFinite);
  const own = [...mine].map((id) => names.get(id) ?? "").filter(Boolean);
  return {
    played: stats.myBest !== null,
    values: {
      noun: context.noun,
      nounPlural: context.nounPlural,
      project: context.project,
      total_runs: String(stats.runs),
      total_avatars: String(stats.avatars),
      median: stats.median !== null ? formatScore(stats.median) : "",
      top_score: stats.best !== null ? formatScore(stats.best) : "",
      name: joinNames(own),
      runs: String(stats.mine.length),
      best_score: stats.myBest !== null ? formatScore(stats.myBest) : "",
      percentile: stats.myBest !== null ? ordinal(percentileOf(all, stats.myBest)) : "",
    },
  };
}
