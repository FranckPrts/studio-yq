import type { ReactNode } from "react";
import { MenuButton } from "./project-menu";

/**
 * The top of every page in the project menu. The menu says where you are; this
 * says what the page is for, so it carries a title and at most a line under it.
 * On a phone it also carries the `menu` button that opens the menu.
 */
export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions beside the title — compact boxed buttons (`buttonClass("boxed", "xs")`). */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-paper/10 pb-3">
      <div className="min-w-0">
        <h1 className="text-sm">{title}</h1>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <MenuButton />
      </div>
    </header>
  );
}
