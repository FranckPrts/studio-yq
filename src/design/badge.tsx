import type { ComponentProps } from "react";
import { cx, SIZE, TONE, TONE_BORDER, type Size, type Tone } from "./tokens";

/**
 * A badge — a short piece of state: `open`, `not provisioned`, `v2 available`,
 * a member's role.
 *
 * Mostly it is coloured text with no container at all, which is what the pages
 * already do (`ready ? "text-dim" : "text-amber-400/80"`). That is the default
 * here. `outlined` adds a hairline box for the cases where the badge sits in a
 * run of other text and needs an edge to be read as a label — square, because
 * the terminal look has no radius.
 *
 * No `"use client"`: badges are inert, so they render from a Server Component,
 * which is where most of this state is already known.
 */

export type BadgeVariant = "bare" | "outlined";

export type BadgeProps = ComponentProps<"span"> & {
  tone?: Tone;
  size?: Size;
  variant?: BadgeVariant;
};

export function badgeClass(
  tone: Tone = "neutral",
  size: Size = "xs",
  variant: BadgeVariant = "bare",
  className?: string,
): string {
  return cx(
    "shrink-0",
    SIZE[size],
    TONE[tone],
    variant === "outlined" && cx("border px-1.5 py-0.5", TONE_BORDER[tone]),
    className,
  );
}

export function Badge({
  tone = "neutral",
  size = "xs",
  variant = "bare",
  className,
  ...rest
}: BadgeProps) {
  return <span className={badgeClass(tone, size, variant, className)} {...rest} />;
}

/**
 * The readiness badge, which is the one this app renders most: a step is either
 * done and quiet, or unfinished and worth noticing.
 *
 * Unfinished is `warning` rather than `danger` because nothing is broken — the
 * project simply is not ready to open yet. Red is for things that failed.
 */
export function ReadyBadge({
  ready,
  children,
  ...rest
}: Omit<BadgeProps, "tone"> & { ready: boolean }) {
  return (
    <Badge tone={ready ? "neutral" : "warning"} {...rest}>
      {children}
    </Badge>
  );
}
