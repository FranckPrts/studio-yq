import "server-only";
import { coerceTheme, type ProjectTheme } from "@/lib/theme/project-theme";

/**
 * Saved pictures of the report map — see the MapSnapshot model. What a
 * snapshot is allowed to carry, and how it is handed to the page.
 */

/**
 * Under Vercel's 4.5 MB request body, with room for the form around it. A map
 * as WebP or JPEG is well under a megabyte; the bound is for a busy one.
 */
export const MAX_SNAPSHOT_BYTES = 4_000_000;
export const MAX_NAME_CHARS = 120;
export const MAX_NOTE_CHARS = 4_000;

/** A name, trimmed: null when it is empty or too long. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_NAME_CHARS ? name : null;
}

/** A note, trimmed at the ends; empty is fine. Null when too long. */
export function cleanNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length <= MAX_NOTE_CHARS ? note : null;
}

/** The look as saved — any junk becomes the default theme's values. */
export function cleanLook(value: unknown): ProjectTheme {
  return coerceTheme(value);
}

export type SnapshotSummary = {
  id: string;
  name: string;
  note: string;
  look: ProjectTheme;
  scriptKey: string;
  highlight: string | null;
  width: number;
  height: number;
  mime: string;
  createdAt: string;
  updatedAt: string;
  /** Where the picture is served from. */
  url: string;
};

/** The columns a summary needs — everything but the picture itself. */
export const SUMMARY_SELECT = {
  id: true,
  name: true,
  note: true,
  look: true,
  scriptKey: true,
  highlight: true,
  width: true,
  height: true,
  mime: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function toSummary(
  slug: string,
  row: {
    id: string;
    name: string;
    note: string;
    look: unknown;
    scriptKey: string;
    highlight: string | null;
    width: number;
    height: number;
    mime: string;
    createdAt: Date;
    updatedAt: Date;
  },
): SnapshotSummary {
  return {
    ...row,
    look: coerceTheme(row.look),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // The picture never changes after it is taken, so the id alone is a
    // stable URL to cache forever.
    url: `/api/projects/${encodeURIComponent(slug)}/report/snapshots/${row.id}`,
  };
}

/** The project's chosen report snapshot, as the studio pages hand it down. */
export type ReportSnapshotInfo = { url: string; name: string; width: number; height: number };

export function reportSnapshotInfo(
  slug: string,
  row: { id: string; name: string; width: number; height: number } | null,
): ReportSnapshotInfo | null {
  if (!row) return null;
  return {
    url: `/api/projects/${encodeURIComponent(slug)}/report/snapshots/${row.id}`,
    name: row.name,
    width: row.width,
    height: row.height,
  };
}
