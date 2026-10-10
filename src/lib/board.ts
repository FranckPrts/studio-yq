/**
 * The leaderboard's ranking, ported from the CCN scoreboard onto `avatars` and
 * `session_scores`. Pure, so the page stays a thin reader.
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

    const strategy =
      typeof score.strategy === "string" && score.strategy.trim()
        ? score.strategy.trim()
        : null;

    rows.push({
      id: score.id,
      rank: rows.length + 1,
      score: Number(score.score),
      recordedAt: score.recorded_at,
      strategy,
      names: [
        nameById.get(score.avatar_a_id) ?? null,
        nameById.get(score.avatar_b_id) ?? null,
      ],
    });
  }

  return rows;
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
