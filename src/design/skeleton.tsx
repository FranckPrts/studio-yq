import type { ComponentProps, ReactNode } from "react";
import { cx } from "./tokens";

/**
 * A placeholder for content that is still on its way — what a `loading.tsx`
 * draws while a page's data streams in.
 *
 * A block on `surface` with the 4px corner, like every other box, breathing
 * slowly (`animate-skeleton` in `globals.css`); still under reduced motion.
 * Hidden from assistive tech: the `SkeletonPage` around it announces the
 * loading once, rather than every grey bar saying nothing.
 *
 * Size it with the caller's `className` (`h-3 w-32`). The text helpers below
 * cover the two line heights the pages actually use.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      {...props}
      className={cx(
        "rounded bg-surface animate-skeleton motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** A line of `text-sm` — a page or row title. */
export function SkeletonTitle({ className }: { className?: string }) {
  return <Skeleton className={cx("h-4 w-40", className)} />;
}

/** A line of `text-xs` — a subtitle, a hint, a section heading. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cx("h-3 w-64 max-w-full", className)} />;
}

/** A compact boxed button (`buttonClass("boxed", "xs")`): 24px tall. */
export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cx("h-6 w-20", className)} />;
}

/**
 * The page header every admin and studio page opens with: a title, a line
 * under it, and room for compact actions on the right. `divided` draws the
 * hairline `PageHeader` and the console put under it.
 */
export function SkeletonHeader({
  actions = 0,
  divided = false,
}: {
  actions?: number;
  divided?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2",
        divided && "border-b border-paper/10 pb-3",
      )}
    >
      <div className="flex flex-col gap-2">
        <SkeletonTitle />
        <SkeletonLine className="w-48" />
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <SkeletonButton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A section: its small heading, then `rows` list rows divided by hairlines —
 * the shape of the projects list, the invitations, the members, the readiness
 * buckets.
 */
export function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <SkeletonLine className="w-24" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-paper/10 pb-3"
        >
          <div className="flex flex-col gap-2">
            <SkeletonTitle className={i % 2 ? "w-32" : "w-48"} />
            <SkeletonLine className={i % 2 ? "w-56" : "w-40"} />
          </div>
          <SkeletonButton />
        </div>
      ))}
    </div>
  );
}

/**
 * The wrapper every `loading.tsx` returns. It carries the `role="status"` and
 * the one "loading" a screen reader hears, and fades in late (`loading-in`) so
 * a fast navigation shows nothing. Lay the skeleton out inside it with the same
 * classes as the page's own `<main>`, so nothing jumps when the page arrives.
 */
export function SkeletonPage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx("animate-loading-in motion-reduce:animate-none", className)}
    >
      <span className="sr-only">loading…</span>
      {children}
    </div>
  );
}
