"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/design";

/**
 * The project menu, grouped by what each page is about rather than listed flat,
 * so a kind of project that needs a different set of pages can change a group
 * without reshuffling the rest. Group headings are labels, not links.
 *
 * A client component only for `usePathname`: the layout that renders it does
 * not re-render on navigation, so it cannot know which page is current.
 */

type Item = {
  label: string;
  href: string;
  /** Highlighted for this path and anything below it. */
  match: string;
  /** Unready reads amber, the same signal the overview uses. */
  ready?: boolean;
  children?: { label: string; href: string }[];
};

export default function Sidebar({
  slug,
  projectName,
  scriptReady,
  databaseReady,
}: {
  slug: string;
  projectName: string;
  scriptReady: boolean;
  databaseReady: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  const groups: { heading?: string; items: Item[] }[] = [
    {
      items: [{ label: "overview", href: base, match: base }],
    },
    {
      heading: "design",
      items: [
        {
          label: "style & language",
          href: `${base}/participant-frontend/colours`,
          match: `${base}/participant-frontend`,
          children: [
            { label: "colours", href: `${base}/participant-frontend/colours` },
            { label: "text & fonts", href: `${base}/participant-frontend/text` },
            { label: "live preview", href: `${base}/participant-frontend/preview` },
          ],
        },
        {
          label: "script & parameters",
          href: `${base}/visual`,
          match: `${base}/visual`,
          ready: scriptReady,
        },
      ],
    },
    {
      heading: "data",
      items: [
        {
          label: "database",
          href: `${base}/database`,
          match: `${base}/database`,
          ready: databaseReady,
        },
      ],
    },
  ];

  // Overview is the base path, so "this path or below" would match every page.
  const isCurrent = (item: Item) =>
    item.match === base
      ? pathname === base
      : pathname === item.match || pathname.startsWith(`${item.match}/`);

  return (
    <nav className="flex flex-col gap-6 text-xs">
      <div className="flex flex-col gap-2">
        <Link
          href="/projects"
          className="text-dim underline-offset-4 hover:text-paper hover:underline"
        >
          ‹ all projects
        </Link>
        <span className="text-sm break-words text-paper">{projectName}</span>
      </div>

      {groups.map((group, i) => (
        <div key={group.heading ?? i} className="flex flex-col gap-2">
          {group.heading && (
            <span className="text-[10px] tracking-widest text-dim/70 uppercase">
              {group.heading}
            </span>
          )}
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => {
              const current = isCurrent(item);
              return (
                <li key={item.href} className="flex flex-col gap-2">
                  <Link
                    href={item.href}
                    aria-current={current && !item.children ? "page" : undefined}
                    className={cx(
                      "flex items-baseline justify-between gap-2 underline-offset-4",
                      current
                        ? "text-paper underline"
                        : "text-dim hover:text-paper hover:underline",
                    )}
                  >
                    <span>{item.label}</span>
                    {item.ready === false && (
                      <span className="shrink-0 text-[10px] text-amber-400/80">
                        not ready
                      </span>
                    )}
                  </Link>
                  {item.children && (
                    <ul className="flex flex-col gap-1.5 border-l border-paper/10 pl-3">
                      {item.children.map((child) => {
                        const here = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={here ? "page" : undefined}
                              className={cx(
                                "underline-offset-4",
                                here
                                  ? "text-paper underline"
                                  : "text-dim hover:text-paper hover:underline",
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
