/**
 * The leaderboard's ranking and its score histogram, ported from the CCN
 * scoreboard onto `avatars` and `session_scores`. Pure, so the page stays a
 * thin reader.
 */

export type BoardScore = {
  id: string;
  avatar_a_id: string;
  avatar_b_id: string;
  score: number;
  strategy: string | null;
  recorded_at: string;
};

export type BoardRow = {
  /** The score's id — stable across polls, so rows don't remount. */
  id: string;
  rank: number;
  score: number;
  recordedAt: string;
  strategy: string | null;
  /** Names as they are now; null when the avatar is no longer in the list. */
  names: readonly [string | null, string | null];
};

/** Highest score first; the more recent run breaks a tie. */
function byScoreDesc(a: BoardScore, b: BoardScore): number {
  if (b.score !== a.score) return b.score - a.score;
  return Date.parse(b.recorded_at) - Date.parse(a.recorded_at);
}

/**
 * One row per avatar: everyone's best pairing, ranked.
 *
 * Walks the scores from best down and keeps a row only when it places an
 * avatar that isn't on the board yet. An avatar's own best row can only be
 * skipped once that avatar already appears higher up, so no one with a score
 * falls off.
 */
export function buildBoard(
  scores: BoardScore[],
  nameById: ReadonlyMap<string, string>,
): BoardRow[] {
  const placed = new Set<string>();
  const rows: BoardRow[] = [];

  for (const score of [...scores].sort(byScoreDesc)) {
    if (placed.has(score.avatar_a_id) && placed.has(score.avatar_b_id)) continue;
    placed.add(score.avatar_a_id);
    placed.add(score.avatar_b_id);
    rows.push(toRow(score, nameById, rows.length + 1, false));
  }

  return rows;
}

/**
 * One participant's results: every run any of their avatars took part in,
 * best first, with theirs on the left of the `/`.
 *
 * A single list rather than one per avatar — someone with three avatars is
 * still reading for their best run, not their best avatar. A run between two
 * of their own appears once, as recorded.
 */
export function buildOwnBoard(
  scores: BoardScore[],
  nameById: ReadonlyMap<string, string>,
  ownIds: ReadonlySet<string>,
): BoardRow[] {
  return scores
    .filter((s) => ownIds.has(s.avatar_a_id) || ownIds.has(s.avatar_b_id))
    .sort(byScoreDesc)
    .map((score, i) =>
      toRow(score, nameById, i + 1, !ownIds.has(score.avatar_a_id)),
    );
}

function toRow(
  score: BoardScore,
  nameById: ReadonlyMap<string, string>,
  rank: number,
  /** Swaps the pair, so the reader's own avatar leads. */
  flip: boolean,
): BoardRow {
  const strategy =
    typeof score.strategy === "string" && score.strategy.trim()
      ? score.strategy.trim()
      : null;
  const [a, b] = flip
    ? [score.avatar_b_id, score.avatar_a_id]
    : [score.avatar_a_id, score.avatar_b_id];

  return {
    id: score.id,
    rank,
    score: Number(score.score),
    recordedAt: score.recorded_at,
    strategy,
    names: [nameById.get(a) ?? null, nameById.get(b) ?? null],
  };
}

/** What one avatar has to show for itself, for the participant's list. */
export type AvatarSummary = { runs: number; best: number | null };

export function summarizeAvatar(
  scores: readonly BoardScore[],
  avatarId: string,
): AvatarSummary {
  let runs = 0;
  let best: number | null = null;
  for (const score of scores) {
    if (score.avatar_a_id !== avatarId && score.avatar_b_id !== avatarId) {
      continue;
    }
    runs += 1;
    const value = Number(score.score);
    if (best === null || value > best) best = value;
  }
  return { runs, best };
}

/** The conclusion's figures: the whole experience, and where theirs landed. */
export type ConclusionStats = {
  runs: number;
  /** Avatars in at least one run. */
  avatars: number;
  median: number | null;
  best: number | null;
  /** Every score their avatars took part in — the histogram's marks. */
  mine: number[];
  myBest: number | null;
  /** Share of all runs that scored below their best, 0–1. */
  beaten: number | null;
};

export function conclusionStats(
  scores: readonly BoardScore[],
  ownIds: ReadonlySet<string>,
): ConclusionStats {
  const values = scores.map((s) => Number(s.score)).filter(Number.isFinite);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

  const inRuns = new Set<string>();
  const mine: number[] = [];
  for (const s of scores) {
    inRuns.add(s.avatar_a_id);
    inRuns.add(s.avatar_b_id);
    const value = Number(s.score);
    if (
      Number.isFinite(value) &&
      (ownIds.has(s.avatar_a_id) || ownIds.has(s.avatar_b_id))
    ) {
      mine.push(value);
    }
  }
  const myBest = mine.length > 0 ? Math.max(...mine) : null;

  return {
    runs: values.length,
    avatars: inRuns.size,
    median,
    best: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    mine,
    myBest,
    beaten:
      myBest === null
        ? null
        : values.filter((v) => v < myBest).length / values.length,
  };
}

/** One run as the histogram needs it: where it landed, and when. */
export type BoardRun = { score: number; recordedAt: string };

export type ScoreBin = { start: number; end: number; count: number };

export type ScoreScale = {
  min: number;
  max: number;
  binWidth: number;
  tickStep: number;
};

/**
 * The histogram's axis: 0–100 in bins of 4, as the CCN plate drew it, widened
 * in steps of 20 to take whatever the scene actually scored — runs above 100
 * do happen. Past a span of 200, bins and ticks widen together, so the plate
 * never holds more than 50 bars or 11 labels.
 */
export function scoreScale(scores: readonly number[]): ScoreScale {
  const finite = scores.filter(Number.isFinite);
  const min = Math.min(0, Math.floor(Math.min(...finite) / 20) * 20);
  const max = Math.max(100, Math.ceil(Math.max(...finite) / 20) * 20);
  const k = Math.ceil((max - min) / 200);
  return { min, max, binWidth: 4 * k, tickStep: 20 * k };
}

/**
 * Counts scores into equal-width bins across [min, max], as the CCN conclusion
 * plate did. A score off the scale is clamped into the end bin rather than
 * dropped, so the plate always accounts for every run.
 */
export function buildBins(
  scores: readonly number[],
  min: number,
  max: number,
  binWidth: number,
): ScoreBin[] {
  const binCount = Math.max(1, Math.round((max - min) / binWidth));
  const bins: ScoreBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
  }));

  for (const score of scores) {
    if (!Number.isFinite(score)) continue;
    const idx = Math.floor((score - min) / binWidth);
    bins[Math.min(binCount - 1, Math.max(0, idx))].count += 1;
  }

  return bins;
}

/** The most recently recorded run; null when there are none. */
export function latestRun(runs: readonly BoardRun[]): BoardRun | null {
  let latest: BoardRun | null = null;
  for (const run of runs) {
    if (!latest || Date.parse(run.recordedAt) > Date.parse(latest.recordedAt)) {
      latest = run;
    }
  }
  return latest;
}

/**
 * A few sentences, typed by the experimenter after a run. Enforced when a
 * session is edited, so a strategy always sits on the board without swamping it.
 */
export const MAX_STRATEGY_LENGTH = 500;

/** One decimal is all the board needs. */
export function formatScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(1) : "--";
}

/** `01`, `02`, … — a ranked list reads better with the column held open. */
export function formatRank(rank: number): string {
  return String(rank).padStart(2, "0");
}

/** Time of day only: an event runs in a single sitting. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
