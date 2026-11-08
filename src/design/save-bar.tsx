import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./tokens";

export type SaveBarProps = ComponentPropsWithoutRef<"div">;

/**
 * The row holding a section's save button and its status ("unsaved changes",
 * "saved", an error).
 *
 * It sticks to the bottom of the window while its section is on screen, so a
 * long form can be saved from wherever the tenant has scrolled to. Put it last
 * in the form: `sticky` only holds it inside its parent, so it rides along the
 * section and settles at the section's end instead of covering the next one.
 *
 * The background is the page's own (`void`) so fields scroll under it cleanly.
 */
export function SaveBar({ className, ...props }: SaveBarProps) {
  return (
    <div
      className={cx(
        "sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-paper/10 bg-void py-3",
        className,
      )}
      {...props}
    />
  );
}
