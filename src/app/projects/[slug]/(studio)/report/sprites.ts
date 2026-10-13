"use client";

import { useEffect, useState } from "react";
import { resolveFontStack, softenSprite } from "@/lib/report/map-render";
import type { CaptureResult, CaptureSubject } from "./capture";

/**
 * Turns finished mini-avatar pictures into images the canvas can draw, once
 * each. `raw` is the picture as taken, for the email's portrait; `sprites` is
 * what the map draws — the same, except a main script's picture is faded to a
 * soft disc so it does not sit on the map as a hard-edged square.
 */
export function useSprites(
  subjects: CaptureSubject[],
  resultOf: (s: CaptureSubject) => CaptureResult | undefined,
  source: "mini" | "main",
) {
  const [loaded, setLoaded] = useState<{
    raw: Map<string, HTMLImageElement>;
    sprites: Map<string, CanvasImageSource>;
  }>({ raw: new Map(), sprites: new Map() });

  // The ids with a picture ready but not yet loaded — a string, so the effect
  // runs when that set changes rather than on every render.
  const ready = subjects
    .filter((s) => {
      const r = resultOf(s);
      return r && "image" in r && !loaded.raw.has(s.id);
    })
    .map((s) => s.id)
    .join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const ids = new Set(ready.split(","));
    const pending = subjects
      .filter((s) => ids.has(s.id))
      .map(
        (s) =>
          new Promise<[string, HTMLImageElement] | null>((resolve) => {
            const r = resultOf(s);
            if (!r || !("image" in r)) return resolve(null);
            const img = new Image();
            img.onload = () => resolve([s.id, img]);
            img.onerror = () => resolve(null);
            img.src = r.image;
          }),
      );
    Promise.all(pending).then((entries) => {
      if (cancelled) return;
      setLoaded((prev) => {
        const raw = new Map(prev.raw);
        const sprites = new Map(prev.sprites);
        for (const entry of entries) {
          if (!entry) continue;
          raw.set(entry[0], entry[1]);
          sprites.set(entry[0], source === "main" ? softenSprite(entry[1]) : entry[1]);
        }
        return { raw, sprites };
      });
    });
    return () => {
      cancelled = true;
    };
    // `ready` already captures what changed in `subjects` and `resultOf`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, source]);

  return loaded;
}

/**
 * A font-family list resolved for canvas and loaded, or null until it is.
 * Drawing before the face has loaded measures labels for a fallback font.
 */
export function useCanvasFont(stack: string, sizePx: number): string | null {
  const [font, setFont] = useState<string | null>(null);
  useEffect(() => {
    const resolved = resolveFontStack(stack);
    let cancelled = false;
    document.fonts
      .load(`${sizePx}px ${resolved}`)
      .catch(() => [])
      .then(() => !cancelled && setFont(resolved));
    return () => {
      cancelled = true;
    };
  }, [stack, sizePx]);
  return font;
}
