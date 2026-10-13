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
  /** The participant's answers to `text` parameters, by parameter name. */
  answers: Record<string, string>;
  createdAt: string;
};

export type RoomRun = {
  id: string;
  a: string;
  b: string;
  score: number;
  /** The experimenter's note on how the pair did it, if any. */
  strategy: string;
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
      answers: a.answers,
      createdAt: a.created_at,
    };
  });
}

export async function loadRuns(client: SupabaseClient): Promise<RoomRun[]> {
  const { data, error } = await client
    .from(SCORES_TABLE)
    .select("id,avatar_a_id,avatar_b_id,score,strategy,recorded_at")
    .order("recorded_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => ({
      id: String(r.id),
      a: String(r.avatar_a_id),
      b: String(r.avatar_b_id),
      score: Number(r.score),
      strategy: typeof r.strategy === "string" ? r.strategy.trim() : "",
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

/**
 * The room as it stood at `asOf`: avatars made and runs recorded after it are
 * left out. A send freezes the room this way when it starts, so a score
 * recorded halfway through cannot change the map between two emails.
 */
export function freezeRoom(room: Room, asOf: string): Room {
  const cutoff = Date.parse(asOf);
  const avatars = room.avatars.filter((a) => !(Date.parse(a.createdAt) > cutoff));
  const ids = new Set(avatars.map((a) => a.id));
  return {
    avatars,
    runs: room.runs.filter(
      (r) => ids.has(r.a) && ids.has(r.b) && !(Date.parse(r.recordedAt) > cutoff),
    ),
  };
}
