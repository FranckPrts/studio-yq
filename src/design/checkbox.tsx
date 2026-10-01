import type { ComponentProps, ReactNode } from "react";
import { choiceClass } from "./button";
import { cx, FOCUS_RING, SIZE, type Size } from "./tokens";

/**
 * Checkboxes, drawn as `[ ]` and `[x]`.
 *
 * The app currently renders bare `<input type="checkbox">` with no classes at
 * all, which means the browser's own control: a light-mode OS checkbox sitting
 * on the void, ignoring the project palette completely. Rather than repaint a
 * replaced element — `appearance-none` plus a background, which cannot carry a
 * mark reliably — the real input is kept for forms and accessibility and
 * visually hidden, and the glyph beside it is text in the palette.
 *
 * Which is also just what this interface looks like. `on`/`off` and the
 * underlined option rows are already text; a typed `[x]` belongs with them.
 *
 * Both glyphs are a fixed `3ch` wide so toggling one does not nudge its label
 * sideways in a proportional face.
 */

const GLYPH = "w-[3ch] shrink-0 text-center";

// `size` is omitted from the native props deliberately: `<input>` has its own
// numeric `size` attribute, which is meaningless on a checkbox and would
// intersect with the type scale to `never`. Same in `./radio` and `./select`.
export type CheckboxProps = Omit<
  ComponentProps<"input">,
  "type" | "children" | "size"
> & {
  /** The label text. Clicking it toggles, because the `<label>` wraps both. */
  children: ReactNode;
  size?: Size;
};

export function Checkbox({
  children,
  size = "xs",
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  return (
    <label
      className={cx(
        "flex items-center gap-2 text-dim",
        SIZE[size],
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        className,
      )}
    >
      <input type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />
      <span aria-hidden className={cx("inline-block", GLYPH, "peer-checked:hidden", FOCUS_RING)}>
        [ ]
      </span>
      <span
        aria-hidden
        className={cx("hidden", GLYPH, "text-paper peer-checked:inline-block", FOCUS_RING)}
      >
        [x]
      </span>
      <span>{children}</span>
    </label>
  );
}

/**
 * Several options, any number of them chosen — the multiselect row from the
 * participant controls, where each option is a text button that underlines when
 * picked rather than growing a box.
 *
 * `maxSelected` locks the *unchosen* once the limit is reached, never the
 * chosen, so there is always a way back out of a full group.
 *
 * Fully controlled: it holds no state, which is what lets the participant
 * runtime keep every parameter in one object.
 */
export type MultiOptionGroupProps = {
  /** Names the group for assistive tech. Not rendered. */
  label: string;
  options: readonly { value: string; label: string }[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  maxSelected?: number;
  disabled?: boolean;
  size?: Size;
  className?: string;
};

export function MultiOptionGroup({
  label,
  options,
  value,
  onChange,
  maxSelected,
  disabled = false,
  size = "sm",
  className,
}: MultiOptionGroupProps) {
  const atMax = maxSelected != null && value.length >= maxSelected;

  return (
    <div
      role="group"
      aria-label={label}
      className={cx("flex flex-wrap gap-x-6 gap-y-1", className)}
    >
      {options.map((option) => {
        const active = value.includes(option.value);
        const locked = disabled || (atMax && !active);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={active}
            disabled={locked}
            onClick={() =>
              onChange(
                active
                  ? value.filter((v) => v !== option.value)
                  : [...value, option.value],
              )
            }
            className={choiceClass(active, locked, size)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
