import type { Room, RoomAvatar } from "./room";

/**
 * The room as people rather than avatars. A participant may own several
 * avatars, and gets one report covering all of them — so everything a report
 * says about "you" is gathered across them here.
 */

export type Person = {
  owner: string;
  /** Oldest first, the order their own list shows them in. */
  avatars: RoomAvatar[];
  names: string[];
};

export type PersonStats = {
  runs: number;
  /** Different people played with — not avatars, and never themselves. */
  partners: number;
  best: number | null;
  average: number | null;
  /** Where their best run falls among every run, 0–100. */
  percentile: number | null;
  /** The experimenter's note on their best run, if there is one. */
  topStrategy: string;
};

export function peopleOf(room: Room): Person[] {
  const byOwner = new Map<string, RoomAvatar[]>();
  for (const a of room.avatars) {
    byOwner.set(a.owner, [...(byOwner.get(a.owner) ?? []), a]);
  }
  return [...byOwner.entries()]
    .map(([owner, avatars]) => ({ owner, avatars, names: avatars.map((a) => a.name) }))
    .sort((x, y) => x.names[0].localeCompare(y.names[0]));
}

/**
 * Midrank percentile, as the CCN recap figured it: every run below, plus half
 * of any tied — so the best run of a room is not "100th" against itself.
 */
export function percentileOf(all: readonly number[], mark: number): number {
  if (all.length === 0) return 0;
  let below = 0;
  let tied = 0;
  for (const s of all) {
    if (s < mark) below += 1;
    else if (s === mark) tied += 1;
  }
  return Math.round((100 * (below + 0.5 * tied)) / all.length);
}

/** 1 → "1st", 22 → "22nd", 79 → "79th". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function statsOf(room: Room, person: Person): PersonStats {
  const mine = new Set(person.avatars.map((a) => a.id));
  const ownerOf = new Map(room.avatars.map((a) => [a.id, a.owner]));
  const runs = room.runs.filter((r) => mine.has(r.a) || mine.has(r.b));

  const partners = new Set<string>();
  for (const r of runs) {
    for (const id of [r.a, r.b]) {
      const owner = ownerOf.get(id);
      if (!mine.has(id) && owner && owner !== person.owner) partners.add(owner);
    }
  }

  if (runs.length === 0) {
    return { runs: 0, partners: 0, best: null, average: null, percentile: null, topStrategy: "" };
  }
  const bestRun = runs.reduce((b, r) => (r.score > b.score ? r : b));
  const average = runs.reduce((sum, r) => sum + r.score, 0) / runs.length;
  return {
    runs: runs.length,
    partners: partners.size,
    best: bestRun.score,
    average,
    percentile: percentileOf(
      room.runs.map((r) => r.score),
      bestRun.score,
    ),
    topStrategy: bestRun.strategy,
  };
}
