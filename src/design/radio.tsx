import type { ComponentProps, ReactNode } from "react";
import { choiceClass } from "./button";
import { cx, FOCUS_RING, SIZE, type Size } from "./tokens";

/**
 * Radios — one of several — drawn as `( )` and `(o)`.
 *
 * Same construction as `Checkbox`, and for the same reason: the native input is
 * kept for forms and assistive tech and visually hidden, while the mark beside
 * it is text that follows the project palette. Round brackets rather than
 * square, so the two controls stay distinguishable at a glance without either
 * growing a border radius the terminal look does not allow.
 */

const GLYPH = "w-[3ch] shrink-0 text-center";

// `size` omitted from the native props — see the note in `./checkbox`.
export type RadioProps = Omit<
  ComponentProps<"input">,
  "type" | "children" | "size"
> & {
  children: ReactNode;
  size?: Size;
};

export function Radio({
  children,
  size = "xs",
  disabled,
  className,
  ...rest
}: RadioProps) {
  return (
    <label
      className={cx(
        "flex items-center gap-2 text-dim",
        SIZE[size],
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        className,
      )}
    >
      <input type="radio" disabled={disabled} className="peer sr-only" {...rest} />
      <span aria-hidden className={cx("inline-block", GLYPH, "peer-checked:hidden", FOCUS_RING)}>
        ( )
      </span>
      <span
        aria-hidden
        className={cx("hidden", GLYPH, "text-paper peer-checked:inline-block", FOCUS_RING)}
      >
        (o)
      </span>
      <span>{children}</span>
    </label>
  );
}

/**
 * A set of radios sharing one `name`, so the group posts a single value.
 *
 * A real `<fieldset>`: native radios already group themselves by name, and the
 * legend names the set for a screen reader without adding a visible heading
 * where the pages do not have one.
 */
export type RadioGroupProps = {
  /** Names the group for assistive tech. Hidden unless `showLegend`. */
  label: string;
  name: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  /** Controlled. Omit it and pass `defaultValue` for a plain form post. */
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  disabled?: boolean;
  size?: Size;
  showLegend?: boolean;
  className?: string;
};

export function RadioGroup({
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
  disabled = false,
  size = "xs",
  showLegend = false,
  className,
}: RadioGroupProps) {
  return (
    <fieldset disabled={disabled} className={cx("flex flex-col gap-1", className)}>
      <legend className={showLegend ? cx(SIZE.xs, "text-dim") : "sr-only"}>
        {label}
      </legend>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          size={size}
          disabled={option.disabled}
          checked={value === undefined ? undefined : value === option.value}
          defaultChecked={
            value === undefined && defaultValue !== undefined
              ? defaultValue === option.value
              : undefined
          }
          onChange={onChange ? () => onChange(option.value) : undefined}
        >
          {option.label}
        </Radio>
      ))}
    </fieldset>
  );
}

/**
 * The participant flow's segmented select: one row of text buttons, the chosen
 * one underlined. Semantically a radio group, which is why it sits here rather
 * than in `./select` next to the dropdown.
 *
 * Use this where the options are few and worth reading at once, and `Select`
 * where they are many or the row would wrap.
 *
 * Fully controlled, holding no state — the runtime keeps every parameter in one
 * object and this must not fork a copy of it.
 */
export type OptionGroupProps = {
  /** Names the group for assistive tech. Not rendered. */
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  size?: Size;
  className?: string;
};

export function OptionGroup({
  label,
  options,
  value,
  onChange,
  disabled = false,
  size = "sm",
  className,
}: OptionGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("flex flex-wrap gap-x-6 gap-y-1", className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              choiceClass(active, false, size),
              disabled && "cursor-not-allowed",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
