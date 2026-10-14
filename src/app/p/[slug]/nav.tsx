import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * Where a participant can go from one of their pages. Real pages are real
 * URLs, so a link can be shared, bookmarked or put on a QR code; the
 * participant-frontend preview swaps screens in place instead, because it
 * must never leave its frame for a page that would read real data.
 */
export type Destination = "home" | "results" | "conclusion";

export type Nav =
  | { slug: string }
  | { onNavigate: (to: Destination) => void };

export function participantHref(slug: string, to: Destination): string {
  const base = `/p/${encodeURIComponent(slug)}`;
  return to === "home" ? base : `${base}/${to}`;
}

export function NavLink({
  nav,
  to,
  className,
  style,
  children,
}: {
  nav: Nav;
  to: Destination;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if ("slug" in nav) {
    return (
      <Link href={participantHref(nav.slug, to)} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => nav.onNavigate(to)}
      className={`text-left ${className ?? ""}`}
      style={style}
    >
      {children}
    </button>
  );
}
