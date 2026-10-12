import { formatRank, formatScore, formatTime, type BoardRow } from "@/lib/board";

/**
 * One run, as both boards draw it: the room's leaderboard on a projector, and
 * a participant's own results on their phone — `compact` for the second.
 */

/** Rank column plus the row gap — sub-lines hang off the same left rail. */
const RAIL = "pl-[calc(2ch+0.75rem)]";

export default function BoardRowItem({
  row,
  unnamed,
  compact = false,
}: {
  row: BoardRow;
  /** Stands in for an avatar saved with a blank name, or no longer listed. */
  unnamed: string;
  compact?: boolean;
}) {
  const [a, b] = row.names;
  return (
    <li>
      <div aria-hidden className="term-rule text-dim/40" />
      <div className={compact ? "py-4" : "py-5"}>
        <div className="flex items-baseline gap-3">
          <span className="w-[2ch] shrink-0 text-sm tabular-nums text-dim">
            {formatRank(row.rank)}
          </span>
          <p
            className={`min-w-0 flex-1 leading-snug ${compact ? "text-sm" : "text-lg"}`}
          >
            {a || unnamed}
            <span className="px-2 text-dim">/</span>
            {b || unnamed}
          </p>
          {/* Margin, not padding — `w-[5ch]` is border-box and `100.0` needs it all. */}
          <span
            className={`ml-1 w-[5ch] shrink-0 text-right tabular-nums ${compact ? "text-base" : "text-xl"}`}
          >
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
