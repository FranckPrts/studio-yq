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
  /** Unready reads amber, the same signal the settings page uses. */
  ready?: boolean;
  /** Whether the project is open to participants, shown as a pill. */
  openState?: boolean;
  /**
   * Opens in its own tab — the console on a second screen, the board on a
   * projector — so neither carries this menu.
   */
  newTab?: boolean;
  /** Shown on hover. */
  hint?: string;
  children?: { label: string; href: string }[];
};

export default function Sidebar({
  slug,
  projectName,
  open,
  scriptReady,
  databaseReady,
}: {
  slug: string;
  projectName: string;
  open: boolean;
  scriptReady: boolean;
  databaseReady: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  const groups: { heading?: string; items: Item[] }[] = [
    {
      heading: "overview",
      items: [
        { label: "settings", href: base, match: base, openState: open },
        {
          label: "live console",
          href: `${base}/console`,
          match: `${base}/console`,
          newTab: true,
          hint: "For whoever is running the session.",
        },
        {
          label: "leaderboard",
          href: `${base}/board`,
          match: `${base}/board`,
          newTab: true,
          hint: "What the room sees.",
        },
      ],
    },
    {
      heading: "design",
      items: [
        {
          label: "style & language",
          href: `${base}/participant-frontend/colours`,
          match: `${base}/participant-frontend`,
          children: [
            { label: "colours & font", href: `${base}/participant-frontend/colours` },
            { label: "text & participant copy", href: `${base}/participant-frontend/text` },
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
      heading: "participant report",
      items: [
        {
          label: "mini-avatar",
          href: `${base}/report/mini-avatar`,
          match: `${base}/report/mini-avatar`,
          hint: "The simplified avatar drawn on the map and in the email.",
        },
        {
          label: "map",
          href: `${base}/report/map`,
          match: `${base}/report/map`,
          hint: "The room as every report shows it.",
        },
        {
          label: "email",
          href: `${base}/report/email`,
          match: `${base}/report/email`,
          hint: "What each participant receives.",
        },
        {
          label: "send",
          href: `${base}/report/send`,
          match: `${base}/report/send`,
          hint: "Consent, the sending account, and sending.",
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

  // Settings is the base path, so "this path or below" would match every page.
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
                    target={item.newTab ? "_blank" : undefined}
                    title={item.hint}
                    aria-current={current && !item.children ? "page" : undefined}
                    className={cx(
                      "group flex items-center justify-between gap-2",
                      current ? "text-paper" : "text-dim hover:text-paper",
                    )}
                  >
                    {/* Underline the label only, not the badges beside it. */}
                    <span
                      className={cx(
                        "underline-offset-4",
                        current ? "underline" : "group-hover:underline",
                      )}
                    >
                      {item.label}
                      {item.newTab && " ↗"}
                    </span>
                    {item.openState !== undefined && (
                      <span
                        className={cx(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-[10px]",
                          item.openState
                            ? "border-paper/20 text-paper/80"
                            : "border-paper/10 text-dim",
                        )}
                      >
                        {item.openState && (
                          <span
                            aria-hidden
                            className="size-1.5 animate-beacon rounded-full bg-emerald-400 motion-reduce:animate-none"
                          />
                        )}
                        {item.openState ? "open" : "closed"}
                      </span>
                    )}
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
