import type { ComponentProps, ReactNode } from "react";
import { cx, FOCUS_RING, SIZE, type Size } from "./tokens";

/**
 * Buttons.
 *
 * There is no filled or boxed button here, and that is on purpose: the terminal
 * look is *underlined text* (`docs/participant-styling.md`), and every button
 * the app actually renders today is one of the five shapes below. They were
 * read off the existing markup rather than invented, so swapping a hand-written
 * button for one of these produces the same classes.
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
  | "choice";

/** The size each variant uses unless the caller overrides it. */
const DEFAULT_SIZE: Record<ButtonVariant, Size> = {
  action: "sm",
  plain: "sm",
  quiet: "xs",
  danger: "xs",
  choice: "sm",
};

const VARIANT: Record<ButtonVariant, string> = {
  action: "text-paper underline underline-offset-4 disabled:text-dim",
  plain: "underline underline-offset-4 disabled:no-underline",
  quiet: "text-dim underline-offset-4 hover:text-paper hover:underline disabled:no-underline disabled:text-dim/50",
  danger: "text-dim underline-offset-4 hover:text-red-400 hover:underline disabled:no-underline disabled:text-dim/50",
  choice: "underline-offset-4",
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
): string {
  return cx(SIZE[size], VARIANT[variant], FOCUS_RING, className);
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
  size?: Size;
  /**
   * A server action is in flight. Disables the button on its own, so callers
   * stop writing `disabled={pending || …}`. The *label* stays the caller's
   * business — "saving…" is tenant copy on the participant side.
   */
  pending?: boolean;
};

export function Button({
  children,
  variant = "action",
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
      className={buttonClass(variant, size, className)}
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
  size?: Size;
};

export function ButtonLink({
  variant = "quiet",
  size,
  className,
  ...rest
}: ButtonLinkProps) {
  return <a className={buttonClass(variant, size, className)} {...rest} />;
}
