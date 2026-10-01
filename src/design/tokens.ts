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
 * three colour roles, underlined text buttons, flat square controls, no radius
 * or shadow, and literal colours only for diagnostics.
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
 * A text field: the `.term-input` base from `globals.css` plus the hairline it
 * is always paired with. Not a primitive of its own yet — `Select` needs it,
 * and extracting the field component is on the to-do.
 */
export const FIELD = "term-input border-b border-paper/20";

/**
 * A `<select>` needs `bg-void` on top of `FIELD`: the dropdown list is painted
 * by the OS from the element's own background, and a transparent one renders
 * the options unreadable rather than inheriting the page.
 */
export const FIELD_SELECT = cx(FIELD, "bg-void");

/**
 * How loud a piece of status is.
 *
 * `neutral` and `strong` are the two palette roles for text. `warning` and
 * `danger` are deliberately literal — they are the diagnostic amber and red
 * that `docs/participant-styling.md` reserves for "something needs attention"
 * and "something is broken", and tenants do not get to restyle them, because
 * they are the one signal that must not be tuned into invisibility.
 */
export type Tone = "neutral" | "strong" | "warning" | "danger";

export const TONE: Record<Tone, string> = {
  neutral: "text-dim",
  strong: "text-paper",
  warning: "text-amber-400/80",
  danger: "text-red-400",
};

/** The same four tones as a border, for outlined badges and bordered panels. */
export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-paper/20",
  strong: "border-paper/40",
  warning: "border-amber-500/40",
  danger: "border-red-500/40",
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
