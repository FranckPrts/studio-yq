/**
 * The design system.
 *
 * One import for every primitive, so a page pulls `@/design` and not seven
 * paths.
 *
 * Two rules hold this together, both from `docs/participant-styling.md`:
 *
 * 1. **No colour values.** Everything resolves to `--color-void`,
 *    `--color-paper` or `--color-dim`, which each project overrides. The only
 *    literals are diagnostic amber and red, and hue ramps the script supplies.
 * 2. **No `"use client"` in this folder.** Every primitive is a plain element,
 *    so it renders from a Server Component as happily as from a Client one —
 *    just like the `<button>` or `<select>` it replaces. A caller passing
 *    `onChange` needs to be a Client Component, which was already true.
 *
 * Each component takes the native props of the element it wraps and appends its
 * `className` last, so an existing call site can usually be swapped by changing
 * the tag and deleting its class string.
 */

export { cx, FOCUS_RING, FIELD, FIELD_SELECT, TONE, TONE_BORDER, SIZE } from "./tokens";
export type { Tone, Size } from "./tokens";

export { Button, ButtonLink, buttonClass, choiceClass } from "./button";
export type { ButtonProps, ButtonLinkProps, ButtonVariant } from "./button";

export { Select, selectClass, optionsFrom } from "./select";
export type { SelectProps, SelectOption } from "./select";

export { Checkbox, MultiOptionGroup } from "./checkbox";
export type { CheckboxProps, MultiOptionGroupProps } from "./checkbox";

export { Radio, RadioGroup, OptionGroup } from "./radio";
export type { RadioProps, RadioGroupProps, OptionGroupProps } from "./radio";

export { Switch, SwitchRow } from "./toggle";
export type { SwitchProps, SwitchRowProps } from "./toggle";

export { Slider } from "./slider";
export type { SliderProps } from "./slider";

export { Badge, ReadyBadge, badgeClass } from "./badge";
export type { BadgeProps, BadgeVariant } from "./badge";
