"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardScore } from "@/lib/board";
import { AVATARS_TABLE } from "./avatars";

/**
 * A participant's own results — the runs their avatars took part in, and the
 * names of everyone in them. Read straight from the tenant's database like the
 * board, under the same wide read policy, but only their share of it.
 *
 * The most basic form of "view results"; a fuller participant results feature
 * replaces what the page does with this, not where it gets it.
 */

export const SCORES_TABLE = "session_scores";

export type MyRuns = {
  scores: BoardScore[];
  /** Every avatar in those runs, theirs included, by id — names as they are now. */
  names: Map<string, string>;
};

export async function myRuns(
  client: SupabaseClient,
  avatarIds: readonly string[],
): Promise<MyRuns> {
  if (avatarIds.length === 0) return { scores: [], names: new Map() };

  // Ids are uuids we read back from the table, so nothing in them can break
  // out of PostgREST's filter syntax.
  const ids = avatarIds.join(",");
  const { data, error } = await client
    .from(SCORES_TABLE)
    .select("id,avatar_a_id,avatar_b_id,score,strategy,recorded_at")
    .or(`avatar_a_id.in.(${ids}),avatar_b_id.in.(${ids})`);
  if (error) throw new Error(error.message);
  const scores = (data ?? []) as BoardScore[];

  const inRuns = new Set<string>();
  for (const s of scores) {
    inRuns.add(s.avatar_a_id);
    inRuns.add(s.avatar_b_id);
  }
  if (inRuns.size === 0) return { scores, names: new Map() };

  const named = await client
    .from(AVATARS_TABLE)
    .select("id,name")
    .in("id", [...inRuns]);
  if (named.error) throw new Error(named.error.message);

  return {
    scores,
    names: new Map(
      (named.data as { id: string; name: string | null }[]).map((a) => [
        a.id,
        a.name?.trim() ?? "",
      ]),
    ),
  };
}
