import type { ParamValues } from "@/lib/params/coerce";

/**
 * The mini-avatar: the simplified avatar a participant report draws — one per
 * node on the map, and in the email. What the platform promises a mini-script,
 * and what it asks of one in return.
 *
 * Shared by the studio page that explains it, the upload that checks it, and
 * the capture that renders it, so the three cannot drift apart.
 */

/** The frame a capture is taken on. The contract tells tenants this number. */
export const MINI_CAPTURE_FRAME = 60;

/**
 * The size, in CSS pixels, every mini-avatar is drawn at for its picture —
 * whatever size the stage happens to be shown at. A sketch sizes itself from
 * its window, so a picture taken through a 96px stage was a 96px picture,
 * blown up and blurred in the email; and pixel-sized effects (a grain pass
 * that offsets by 5px) scatter a small canvas far more than a large one.
 */
export const MINI_CAPTURE_PX = 512;

/**
 * How long a capture may take before it is given up on. Loading p5 from the
 * CDN plus 60 frames is a second or two; this is for a sketch that errored or
 * called `noLoop()` and so never reaches the frame.
 */
export const MINI_CAPTURE_TIMEOUT_MS = 12_000;

/**
 * Knobs the host sends that no declaration lists — the three every avatar
 * script already honours, plus two only a capture sends. The upload's
 * cross-check ignores them.
 */
export const MINI_HOST_KNOBS = [
  "size",
  "intensity",
  "center_y",
  "seed",
  "mini",
] as const;

/**
 * A stable integer per avatar, for `randomSeed` / `noiseSeed`: the same
 * participant gets the same picture on the map, in the email, and on a re-run.
 * FNV-1a over the id — nothing secret about it, only stable.
 */
export function miniSeed(avatarId: string): number {
  let h = 2166136261;
  for (let i = 0; i < avatarId.length; i++) {
    h ^= avatarId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // p5's seeds want a non-negative number; keep it within a safe 31 bits.
  return (h >>> 0) % 2147483647;
}

/**
 * Host knobs for a capture. `intensity: 1` because a fade-in has nothing to
 * fade in from in a still; `mini: true` so a main script drawing reports can
 * tell, if it cares to.
 */
export function miniHost(avatarId: string): ParamValues {
  return { intensity: 1, center_y: 0.5, seed: miniSeed(avatarId), mini: true };
}

/** What a mini-script must respect, in the words the tenant reads. */
export const MINI_CONTRACT: { rule: string; detail: string }[] = [
  {
    rule: "Same runtime as the main script.",
    detail:
      "p5 1.11.3 in global mode (`setup = () => {}`), in the same sandboxed frame. No network: no `loadImage`, `loadFont` or `loadShader` from a URL — inline shaders as strings. Nothing outside the canvas.",
  },
  {
    rule: "Same parameters, nothing new.",
    detail:
      "It reads the participant's values from `data`, under the names the main script's parameters.json declares. It has no declaration of its own. Fall back to your defaults for anything missing, and ignore what you don't use.",
  },
  {
    rule: "A transparent background.",
    detail:
      "Call `clear()`, not `background()`. The report places it on the project's own background, on the map and in the email.",
  },
  {
    rule: "Centred, at any size.",
    detail:
      "Draw centred, sized from `min(width, height)` — never in fixed pixels. The same script is a small node on the map and a large picture in the email.",
  },
  {
    rule: "The same picture every time.",
    detail:
      "Seed any randomness with `randomSeed(data.seed)` and `noiseSeed(data.seed)`, and drive motion from `frameCount` rather than `millis()`. `seed` is stable per avatar, so a participant always looks the same.",
  },
  {
    rule: `Ready by frame ${MINI_CAPTURE_FRAME}.`,
    detail: `The picture is taken on frame ${MINI_CAPTURE_FRAME}. Any fade-in or settling must be done by then, and the sketch must keep looping until it — a \`noLoop()\` never gets there.`,
  },
  {
    rule: "Readable when small.",
    detail:
      "Few, bold shapes: one fish, not a school. Grain, chromatic aberration and fine detail turn to mush at the size of a map node.",
  },
  {
    rule: "Light.",
    detail:
      "One is rendered per avatar, one after another. Keep to a single canvas and few shader passes.",
  },
];
