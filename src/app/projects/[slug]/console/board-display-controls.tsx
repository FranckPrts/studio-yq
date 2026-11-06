"use client";

import {
  BOARD_SCALE_MAX,
  BOARD_SCALE_MIN,
  BOARD_SCALE_STEP,
  useBoardDisplay,
} from "@/lib/board-display";

/**
 * Sizes the leaderboard from here, so the projector window never needs the
 * browser's zoom (which would resize this console too). Reaches a board open
 * in another window or tab of this same browser, instantly.
 */
export default function BoardDisplayControls({ slug }: { slug: string }) {
  const [display, update] = useBoardDisplay(slug);
  const pct = Math.round(display.scale * 100);
  const nudge = (dir: 1 | -1) =>
    update((d) => ({ scale: d.scale + dir * BOARD_SCALE_STEP * 2 }));

  const button =
    "rounded bg-surface px-2 py-1 text-dim hover:text-paper disabled:opacity-30";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs text-dim">leaderboard display</h2>
        <a
          href={`/projects/${slug}/board`}
          target="_blank"
          rel="noopener"
          className="text-[11px] text-dim underline-offset-4 hover:text-paper hover:underline"
        >
          open board ↗
        </a>
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-baseline justify-between">
          <label htmlFor="board-scale" className="text-dim">
            text size
          </label>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Smaller"
            disabled={display.scale <= BOARD_SCALE_MIN}
            onClick={() => nudge(-1)}
            className={button}
          >
            −
          </button>
          <input
            id="board-scale"
            type="range"
            min={BOARD_SCALE_MIN}
            max={BOARD_SCALE_MAX}
            step={BOARD_SCALE_STEP}
            value={display.scale}
            onChange={(e) => update({ scale: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-current"
          />
          <button
            type="button"
            aria-label="Larger"
            disabled={display.scale >= BOARD_SCALE_MAX}
            onClick={() => nudge(1)}
            className={button}
          >
            +
          </button>
          <button
            type="button"
            disabled={display.scale === 1}
            onClick={() => update({ scale: 1 })}
            className="text-dim underline-offset-4 hover:text-paper hover:underline disabled:opacity-30 disabled:no-underline"
          >
            reset
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={display.showHistogram}
          onChange={(e) => update({ showHistogram: e.target.checked })}
        />
        <span>show histogram</span>
      </label>

      <p className="text-[11px] leading-relaxed text-dim">
        Applies to a board open in this browser, in another window or tab.
      </p>
    </section>
  );
}
