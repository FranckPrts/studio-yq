import type { ComponentProps, CSSProperties } from "react";
import { cx, SIZE } from "./tokens";

/**
 * The slider — a flat bar with a square handle.
 *
 * The look is `.term-range` in `globals.css`, which has to live in CSS rather
 * than in utilities because a range input's track and thumb are only reachable
 * through vendor pseudo-elements. This component is the typed way to reach it,
 * plus the two things callers kept re-deriving: the `--term-track` override and
 * the `| … |` brackets.
 *
 * Note the colour split the stylesheet already encodes — the track is `dim`
 * (structure) and the handle is `paper` (what the participant is moving). That
 * is the palette rule from `docs/participant-styling.md`, not decoration.
 */

export type SliderProps = Omit<ComponentProps<"input">, "type"> & {
  /**
   * Replaces the plain track with a gradient — a hue ramp, typically, showing
   * the colours the parameter actually maps to. Build it from the parameter's
   * own range; the ramp is the script's colours, not the tenant's palette, so
   * this is the one place a literal colour is expected.
   */
  track?: string;
  /**
   * The `|` marks either side, which the participant control rows use to show
   * where the range ends. Off by default — a slider in an admin form has no
   * brackets today.
   */
  brackets?: boolean;
};

export function Slider({
  track,
  brackets = false,
  className,
  style,
  ...rest
}: SliderProps) {
  const input = (
    <input
      type="range"
      className={cx("term-range min-w-0 flex-1", className)}
      style={
        track ? ({ ...style, "--term-track": track } as CSSProperties) : style
      }
      {...rest}
    />
  );

  if (!brackets) return input;

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span aria-hidden className={cx(SIZE.sm, "text-dim")}>
        |
      </span>
      {input}
      <span aria-hidden className={cx(SIZE.sm, "text-dim")}>
        |
      </span>
    </span>
  );
}
