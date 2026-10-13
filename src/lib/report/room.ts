"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderValues, type ParamValues } from "@/lib/params/coerce";
import type { Parameter } from "@/lib/params/types";
import { AVATARS_TABLE, normalizeAvatar } from "@/lib/spoke/avatars";
import { SCORES_TABLE } from "@/lib/spoke/results";

/**
 * Everything a participant report is drawn from: every avatar in the room, and
 * every run between two of them. Read straight from the tenant's database on
 * the publishable key — both tables are readable to it by provisioning, as the
 * console and the board already rely on.
 */

export type RoomDatabase = { projectUrl: string; publishableKey: string };

export type RoomAvatar = {
  id: string;
  /** The participant — one person may own several avatars. */
  owner: string;
  name: string;
  /** Render values only, coerced against the declaration. */
  params: ParamValues;
  createdAt: string;
};

export type RoomRun = {
  id: string;
  a: string;
  b: string;
  score: number;
  recordedAt: string;
};

export type Room = { avatars: RoomAvatar[]; runs: RoomRun[] };

const clients = new Map<string, SupabaseClient>();

/**
 * Its own client with no persisted session, as in the console: a researcher
 * looking at the room must not take out an anonymous participant identity in
 * the same browser. One per project and kept, with a storage key of its own —
 * a fresh client per page visit makes supabase-js warn about several sharing
 * the participant's key.
 */
export function roomClient(database: RoomDatabase): SupabaseClient {
  const existing = clients.get(database.projectUrl);
  if (existing) return existing;
  const client = createClient(database.projectUrl, database.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `yq-room-${new URL(database.projectUrl).hostname.split(".")[0]}`,
    },
  });
  clients.set(database.projectUrl, client);
  return client;
}

export async function loadAvatars(
  client: SupabaseClient,
  parameters: Parameter[],
): Promise<RoomAvatar[]> {
  const { data, error } = await client
    .from(AVATARS_TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const a = normalizeAvatar(row, parameters);
    return {
      id: a.id,
      owner: a.owner,
      name: a.name || "(unnamed)",
      params: renderValues(parameters, a.params),
      createdAt: a.created_at,
    };
  });
}

export async function loadRuns(client: SupabaseClient): Promise<RoomRun[]> {
  const { data, error } = await client
    .from(SCORES_TABLE)
    .select("id,avatar_a_id,avatar_b_id,score,recorded_at")
    .order("recorded_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => ({
      id: String(r.id),
      a: String(r.avatar_a_id),
      b: String(r.avatar_b_id),
      score: Number(r.score),
      recordedAt: String(r.recorded_at),
    }))
    .filter((r) => Number.isFinite(r.score));
}

export async function loadRoom(
  database: RoomDatabase,
  parameters: Parameter[],
): Promise<Room> {
  const client = roomClient(database);
  const [avatars, runs] = await Promise.all([
    loadAvatars(client, parameters),
    loadRuns(client),
  ]);
  return { avatars, runs };
}
