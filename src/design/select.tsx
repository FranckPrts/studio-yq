import type { ComponentProps, ReactNode } from "react";
import { cx, FIELD_SELECT, FOCUS_RING, SIZE, type Size } from "./tokens";

/**
 * The dropdown — a real `<select>`, styled as a terminal field.
 *
 * Native on purpose. A custom popover would have to re-earn keyboard
 * navigation, type-ahead, the touch wheel on iOS and the fact that a `<select>`
 * posts its value in a plain form submission with no JavaScript, which is how
 * every admin form here talks to its server action. The one thing the native
 * element needs help with is `bg-void`: the OS paints the open list from the
 * element's own background, so a transparent one is unreadable.
 *
 * The *other* kind of "select" in this app — a row of text buttons, one
 * underlined — is `OptionGroup` in `./radio`. It is a radio group semantically,
 * so it lives there.
 */

export function selectClass(size: Size = "sm", className?: string): string {
  return cx(FIELD_SELECT, SIZE[size], FOCUS_RING, className);
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

// `size` omitted from the native props: `<select size>` is the number of rows a
// list box shows, which would intersect with the type scale to `never`. Pass
// `rows` through `children` territory if a list box is ever wanted.
export type SelectProps = Omit<ComponentProps<"select">, "children" | "size"> & {
  size?: Size;
  /**
   * The options, for the common case. Omit it and pass `children` instead when
   * the list needs `<optgroup>`, or a placeholder that is not a real value.
   */
  options?: readonly SelectOption[];
  children?: ReactNode;
};

export function Select({
  size = "sm",
  options,
  children,
  className,
  ...rest
}: SelectProps) {
  return (
    <select className={selectClass(size, className)} {...rest}>
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
}

/**
 * Turns a record keyed by value into options — the shape `FONTS` and the other
 * `as const` lookups in `src/lib` already have, so a caller does not have to
 * write the same `Object.entries(...).map(...)` each time.
 */
export function optionsFrom<T extends Record<string, { label: string }>>(
  record: T,
): SelectOption[] {
  return Object.entries(record).map(([value, { label }]) => ({ value, label }));
}
