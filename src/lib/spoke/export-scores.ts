"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SCORES_TABLE } from "./results";

/**
 * Every session score, as a CSV for the experimenter to take away. Read in the
 * browser under the same wide read policy as the console, so none of it passes
 * through us — and from `session_scores` alone: participant contacts never
 * come near it.
 *
 * Once tenants live on databases we provision rather than their own Supabase,
 * this belongs behind a route; the CSV half carries over as it is.
 */

const COLUMNS = [
  "id",
  "yq_session_id",
  "avatar_a_id",
  "avatar_b_id",
  "score",
  "duration",
  "strategy",
  "recorded_at",
] as const;

/** PostgREST's default cap on a single response. */
const PAGE = 1000;

export type ExportScore = Record<(typeof COLUMNS)[number], unknown>;

export async function fetchAllScores(
  client: SupabaseClient,
): Promise<ExportScore[]> {
  const rows: ExportScore[] = [];
  for (let from = 0; ; from += PAGE) {
    // Ordered by id too, so a page boundary can't split a tie and repeat a row.
    const { data, error } = await client
      .from(SCORES_TABLE)
      .select(COLUMNS.join(","))
      .order("recorded_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as ExportScore[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Strategies and names are typed by people; a leading = + - @ would run as a
  // formula when the file is opened in a spreadsheet. Numbers are left alone:
  // a run can score below zero.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Names as they are now, beside the ids, so the file reads on its own. */
export function scoresCsv(
  rows: readonly ExportScore[],
  nameOf: (id: string) => string,
): string {
  const header = [...COLUMNS, "avatar_a_name", "avatar_b_name"];
  const lines = rows.map((r) =>
    [
      ...COLUMNS.map((c) => r[c]),
      nameOf(String(r.avatar_a_id)),
      nameOf(String(r.avatar_b_id)),
    ]
      .map(cell)
      .join(","),
  );
  // The BOM is what makes Excel read the file as UTF-8.
  return "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n";
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
