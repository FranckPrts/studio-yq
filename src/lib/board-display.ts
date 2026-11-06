"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * How the leaderboard window is shown, set from the live console.
 *
 * Browser zoom is per site, so Cmd +/- on the projector window also resized
 * the console beside it. Instead the console writes these settings to
 * localStorage and the board, open in another window of the same browser,
 * picks them up through the `storage` event — no server, no delay. The board
 * also keeps them across a reload. A board on another computer does not see
 * them.
 */

export type BoardDisplay = {
  /** Multiplies every rem-based size on the board: type, spacing, width. */
  scale: number;
  showHistogram: boolean;
};

export const BOARD_DISPLAY_DEFAULT: BoardDisplay = {
  scale: 1,
  showHistogram: true,
};

export const BOARD_SCALE_MIN = 0.5;
export const BOARD_SCALE_MAX = 3;
export const BOARD_SCALE_STEP = 0.05;

const storageKey = (slug: string) => `board-display:${slug}`;

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  const stepped = Math.round(n / BOARD_SCALE_STEP) * BOARD_SCALE_STEP;
  return Math.min(
    BOARD_SCALE_MAX,
    Math.max(BOARD_SCALE_MIN, Number(stepped.toFixed(2))),
  );
}

// useSyncExternalStore needs a stable snapshot: cache the parsed value per raw
// string so an unchanged entry returns the same object.
const cache = new Map<string, { raw: string | null; value: BoardDisplay }>();

function read(slug: string): BoardDisplay {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(slug));
  } catch {
    // Storage blocked: defaults.
  }
  const hit = cache.get(slug);
  if (hit && hit.raw === raw) return hit.value;
  let value = BOARD_DISPLAY_DEFAULT;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<BoardDisplay>;
      value = {
        scale: clampScale(Number(parsed.scale ?? 1)),
        showHistogram: parsed.showHistogram !== false,
      };
    } catch {
      // Unreadable: defaults.
    }
  }
  cache.set(slug, { raw, value });
  return value;
}

// `storage` fires only in the *other* windows; this tab's own writes ping
// these listeners directly.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(slug: string, next: BoardDisplay) {
  try {
    localStorage.setItem(
      storageKey(slug),
      JSON.stringify({ ...next, scale: clampScale(next.scale) }),
    );
  } catch {
    // Not shared or remembered; nothing else to do.
  }
  listeners.forEach((cb) => cb());
}

export function useBoardDisplay(slug: string) {
  const display = useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => BOARD_DISPLAY_DEFAULT,
  );
  const update = useCallback(
    (
      patch:
        Partial<BoardDisplay> | ((d: BoardDisplay) => Partial<BoardDisplay>),
    ) => {
      const current = read(slug);
      const p = typeof patch === "function" ? patch(current) : patch;
      write(slug, { ...current, ...p });
    },
    [slug],
  );
  return [display, update] as const;
}
