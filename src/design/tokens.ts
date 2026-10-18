/**
 * The shared vocabulary every primitive in this folder is built from.
 *
 * Nothing here is a colour value. The palette is three CSS variables that each
 * project overrides (`--color-void`, `--color-paper`, `--color-dim`, declared
 * without `inline` in `globals.css` for exactly that reason), so a primitive
 * that hardcoded a hex would stop following the tenant the moment it shipped.
 * What lives here instead are the *class fragments* — the recurring shapes the
 * markup already repeats by hand in a few dozen places.
 *
 * The rules these encode are written down in `docs/participant-styling.md`:
 * three colour roles, underlined text buttons, boxes set apart by a surface tint
 * rather than a border, 4px corners everywhere, no shadow, and fixed (never
 * tenant-set) colours only for diagnostics.
 */

/**
 * Joins class names, dropping anything falsy, so a caller can pass a
 * conditional without assembling a template string. The codebase has no
 * classnames/clsx dependency and does not need one for this.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The one focus treatment. A thin paper outline held off the control, matching
 * what `.term-range` already does for the slider thumb in `globals.css` — so
 * keyboard focus looks the same whether it lands on a slider, a button or a
 * checkbox.
 */
export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper focus-visible:outline-offset-2";

/**
 * The same ring, drawn on a visible stand-in when the focusable element is a
 * visually hidden `peer` — the `[ ]` glyph beside a checkbox's real input. The
 * glyph never takes focus itself, so `FOCUS_RING` on it would never show.
 */
export const PEER_FOCUS_RING =
  "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-paper peer-focus-visible:outline-offset-2";

/**
 * A text field: the `.term-input` base from `globals.css` on a `surface`, with
 * the 4px corner. It used to be an underline; boxes are tints now, not lines.
 * Not a primitive of its own yet — `Select` needs it, and extracting the field
 * component is on the to-do.
 */
export const FIELD = "term-input rounded bg-surface px-2 py-1.5";

/**
 * A `<select>` is `FIELD` as is. The OS paints the open list from the element's
 * own background, so it must be opaque — `surface` is (mixed with void, not
 * with transparent), which is why there is no separate `bg-void` any more.
 */
export const FIELD_SELECT = FIELD;

/**
 * How loud a piece of status is.
 *
 * `neutral` and `strong` are the two palette roles for text. `warning` and
 * `danger` are the diagnostic amber and red that `docs/participant-styling.md`
 * reserves for "something needs attention" and "something is broken". They are
 * tokens fixed per theme in `globals.css` (`--color-warning`, `--color-danger`
 * and their `-line` borders) and tenants do not get to restyle them, because
 * they are the one signal that must not be tuned into invisibility.
 */
export type Tone = "neutral" | "strong" | "warning" | "danger";

export const TONE: Record<Tone, string> = {
  neutral: "text-dim",
  strong: "text-paper",
  warning: "text-warning/80",
  danger: "text-danger",
};

/**
 * The same four tones as a surface, for tinted badges and panels. Inside a
 * `warning` or `danger` surface, text keeps to that tone and `paper` — `dim`
 * does not reliably clear 4.5:1 on them.
 */
export const TONE_SURFACE: Record<Tone, string> = {
  neutral: "bg-surface",
  strong: "bg-surface-hover",
  warning: "bg-warning-surface",
  danger: "bg-danger-surface",
};

/**
 * The sizes in actual use. `xs` is the 11px that labels and hints settled on;
 * there is no scale beyond this because the pages do not use one.
 */
export type Size = "xs" | "sm" | "base";

export const SIZE: Record<Size, string> = {
  xs: "text-[11px]",
  sm: "text-sm",
  base: "text-base",
};
