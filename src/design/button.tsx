import type { ComponentProps, ReactNode } from "react";
import { cx, FOCUS_RING, SIZE, type Size } from "./tokens";

/**
 * Buttons, in two shapes.
 *
 * Underlined text — the terminal look (`docs/participant-styling.md`) — for
 * secondary actions, ways out and options: `action`, `plain`, `quiet`, `danger`,
 * `choice`, read off the existing markup. And `boxed`, for a form's submit and
 * the few actions that need weight: a surface with the 4px corner, in one of
 * three tones. Which to use when is written out on the Button card of the
 * Studio YQ design system; in short — submit is `boxed`, the one main action on
 * a page is `boxed` `strong`, a destructive press after a confirm is `boxed`
 * `danger`, and everything secondary stays text.
 *
 * No `"use client"`. These are plain elements with no state, so they work from
 * a Server Component (a form posting to a server action) and from a Client
 * Component alike — exactly like the `<button>` they replace. A caller that
 * passes `onClick` needs to be a Client Component, same as before.
 */

export type ButtonVariant =
  /** The forward action: save, next, submit. Reads in the text colour. */
  | "action"
  /**
   * The forward action where the *caller* owns the colour — the participant
   * flow sets it inline from the project theme. Inherits `currentColor`.
   */
  | "plain"
  /** A secondary way out: sign out, a nav link, "cancel". Dim until hovered. */
  | "quiet"
  /** Destructive: remove a member, drop a table. Reddens on hover only. */
  | "danger"
  /**
   * One option inside a group — a segmented select, a multiselect. Underlined
   * when chosen. Prefer `OptionGroup` / `MultiOptionGroup`, which handle the
   * roles and keyboard semantics; this variant is the bare look.
   */
  | "choice"
  /**
   * A box: a surface, the 4px corner. For a form's submit and the actions that
   * need weight. Pick a `tone`. Two sizes: the default (`sm`) is 32px tall with
   * 14px text; `size="xs"` is the compact box — 24px tall (exactly the WCAG
   * 2.5.8 target-size floor), 12px text — for navigation and per-row actions:
   * page-header links, `open project` / `preview` on a list item. Keep 8px
   * between compact neighbours.
   */
  | "boxed";

/**
 * The tone of a `boxed` button.
 *
 * - `default` — `surface`, `paper` text (13:1). A form's submit.
 * - `strong` — inverted, `paper` fill and `void` text (15:1). The one main
 *   action on a page; never two.
 * - `danger` — `danger-surface`, `danger-strongest` text (8:1+). A destructive
 *   press, after an inline confirm. Not inside a danger panel: a red box on red
 *   disappears, so there the text `danger` style stays.
 *
 * Disabled, every tone falls back to `surface` with `dim` text (4.6:1).
 */
export type BoxedTone = "default" | "strong" | "danger";

/** The size each variant uses unless the caller overrides it. */
const DEFAULT_SIZE: Record<ButtonVariant, Size> = {
  action: "sm",
  plain: "sm",
  quiet: "xs",
  danger: "xs",
  choice: "sm",
  boxed: "sm",
};

const VARIANT: Record<ButtonVariant, string> = {
  action: "text-paper underline underline-offset-4 disabled:text-dim",
  plain: "underline underline-offset-4 disabled:no-underline",
  quiet: "text-dim underline-offset-4 hover:text-paper hover:underline disabled:no-underline disabled:text-dim/50",
  danger: "text-dim underline-offset-4 hover:text-danger hover:underline disabled:no-underline disabled:text-dim/50",
  choice: "underline-offset-4",
  boxed:
    "inline-flex w-fit items-center rounded disabled:cursor-default disabled:bg-surface disabled:text-dim",
};

/** A box's size is its padding and height as much as its text. */
const BOXED_SIZE: Record<Size, string> = {
  xs: "min-h-6 px-2 py-1 text-xs",
  sm: "min-h-8 px-3 py-1.5 text-sm",
  base: "min-h-10 px-4 py-2 text-base",
};

const BOXED_TONE: Record<BoxedTone, string> = {
  default: "bg-surface text-paper hover:bg-surface-hover",
  strong: "bg-paper text-void hover:bg-paper/85",
  danger: "bg-danger-surface text-danger-strongest hover:bg-danger-line/20",
};

/**
 * The classes for a button, for the cases a component does not fit: a `<Link>`
 * that should look like one, or a one-off element being migrated a step at a
 * time.
 */
export function buttonClass(
  variant: ButtonVariant = "action",
  size: Size = DEFAULT_SIZE[variant],
  className?: string,
  tone: BoxedTone = "default",
): string {
  return cx(
    variant === "boxed" ? BOXED_SIZE[size] : SIZE[size],
    VARIANT[variant],
    variant === "boxed" && BOXED_TONE[tone],
    FOCUS_RING,
    className,
  );
}

/**
 * The classes for one option in a group.
 *
 * `locked` is the maxed-out case — an unchosen option in a multiselect that has
 * hit its limit. It reads as further out of reach than merely unchosen, because
 * it is: the group has to give something up before it can be picked.
 */
export function choiceClass(
  active: boolean,
  locked = false,
  size: Size = "sm",
): string {
  return cx(
    SIZE[size],
    "underline-offset-4",
    FOCUS_RING,
    active
      ? "text-paper underline"
      : locked
        ? "cursor-not-allowed text-dim/40"
        : "text-dim hover:text-paper/80",
  );
}

export type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Only with `variant="boxed"`. Defaults to `default`. */
  tone?: BoxedTone;
  size?: Size;
  /**
   * A server action is in flight. Disables the button on its own, so callers
   * stop writing `disabled={pending || …}`, and marks it `aria-busy`. The
   * *label* stays the caller's business — "saving…" is tenant copy on the
   * participant side.
   */
  pending?: boolean;
};

export function Button({
  children,
  variant = "action",
  tone,
  size,
  pending = false,
  disabled,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      // Explicit, because a bare <button> inside a <form> submits it, and that
      // has been the source of enough accidental posts to be worth stating.
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className, tone)}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * `Button`'s look on an anchor. For a real navigation, prefer `next/link` with
 * `buttonClass()` so the route still prefetches — this is for external hrefs
 * and `mailto:`, where there is nothing to prefetch.
 */
export type ButtonLinkProps = ComponentProps<"a"> & {
  variant?: ButtonVariant;
  tone?: BoxedTone;
  size?: Size;
};

export function ButtonLink({
  variant = "quiet",
  tone,
  size,
  className,
  ...rest
}: ButtonLinkProps) {
  return <a className={buttonClass(variant, size, className, tone)} {...rest} />;
}
