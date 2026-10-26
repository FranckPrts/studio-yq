"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { buttonClass, cx } from "@/design";

/**
 * On a phone the project menu would sit above every page, a dozen links before
 * the content. Below `md` it hides behind a `menu` button in the page header and
 * opens full screen; from `md` up it is the sidebar as before, and none of this
 * applies.
 *
 * The open state remembers the path it was opened on, so any navigation —
 * a link in the menu, the back button — closes it without an effect.
 */

const MenuContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(
  null,
);

export function ProjectMenuProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (next: boolean) => setOpenAt(next ? pathname : null);
  return <MenuContext value={{ open, setOpen }}>{children}</MenuContext>;
}

function useMenu() {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("ProjectMenuProvider is missing");
  return menu;
}

/** The page header's `menu` button. Phones only. */
export function MenuButton() {
  const { open, setOpen } = useMenu();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={open}
      aria-controls="project-menu"
      className={cx(buttonClass("boxed", "xs"), "md:hidden")}
    >
      menu
    </button>
  );
}

/**
 * The sidebar's box. Hidden on a phone until opened, then covering the page with
 * a `close` button over the menu.
 */
export function MenuPanel({ children }: { children: ReactNode }) {
  const { open, setOpen } = useMenu();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <aside
      id="project-menu"
      // A link to the page already open changes no path; close on it too.
      onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
      className={cx(
        "shrink-0 bg-void md:sticky md:top-0 md:block md:h-screen md:w-60 md:overflow-y-auto md:border-r md:border-paper/10 md:p-6",
        open ? "fixed inset-0 z-50 overflow-y-auto p-4" : "hidden",
      )}
    >
      <div className="mb-4 flex justify-end md:hidden">
        <button
          ref={close}
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClass("boxed", "xs")}
        >
          close
        </button>
      </div>
      {children}
    </aside>
  );
}
