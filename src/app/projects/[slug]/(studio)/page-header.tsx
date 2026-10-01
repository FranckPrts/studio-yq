import type { ReactNode } from "react";

/**
 * The top of every page in the project menu. The menu says where you are; this
 * says what the page is for, so it carries a title and at most a line under it.
 */
export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions beside the title. */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-paper/10 pb-3">
      <div className="min-w-0">
        <h1 className="text-sm">{title}</h1>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 gap-4 text-xs">{children}</div>}
    </header>
  );
}
