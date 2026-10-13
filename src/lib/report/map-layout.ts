import type { Room } from "./room";

/**
 * Where everyone sits on the report map — the layout of the CCN recap
 * constellation (`image.p5`), kept so every participant's email shows the same
 * map with only the highlight moving.
 *
 * One node per avatar and one link per pair that played together, the best
 * run kept. Pairs are placed in the order they first played: someone's first
 * pairing puts them at a distance that encodes how well it went (closer is
 * better); later pairings join at whatever distance the map allows, and still
 * show their quality in the link. Avatars that never played are placed last,
 * smaller and dimmer, so nobody is missing from their own report.
 *
 * Deterministic: positions come from hashes of ids, never from Math.random, so
 * the same room always draws the same map.
 *
 * Coordinates are in units of the map's height: x in [0, aspect], y in [0, 1].
 * Measuring both axes in the same unit keeps distances honest on a wide map,
 * where uv coordinates would stretch them sideways.
 */

export const MAP_ASPECT = 3 / 2;

const C = {
  /** Separation of a first pairing: worst run → best run. */
  sepFar: 0.24,
  sepNear: 0.09,
  /** Node radius (the figure, not its picture's padding): no runs → best. */
  radMin: 0.024,
  radMax: 0.042,
  radUnplayed: 0.018,
  /** Node opacity: worst → best; never played. */
  briLow: 0.72,
  briHigh: 1,
  briUnplayed: 0.45,
  /** Free space kept between two nodes, beyond their radii. */
  minSpacing: 0.02,
  placeTries: 80,
  /**
   * How many avatars fit at full size. Past it, nodes and the space between
   * them shrink with the square root of the crowd, down to `minScale`, so a
   * big room stays legible instead of overlapping.
   */
  comfortable: 40,
  minScale: 0.55,
  /**
   * Kept clear at the edges. A highlighted node's ring and name reach well
   * past its radius, and the name sits below it — hence bottom > top.
   */
  margin: { left: 0.08, right: 0.08, top: 0.08, bottom: 0.14 },
};

export type MapNode = {
  id: string;
  owner: string;
  name: string;
  x: number;
  y: number;
  rad: number;
  bri: number;
  played: boolean;
};

export type MapEdge = {
  /** Indexes into `nodes`. */
  a: number;
  b: number;
  /** The pair's best score, as recorded. */
  score: number;
  /** That score within the room's range: 0 = the worst run, 1 = the best. */
  norm: number;
};

export type MapLayout = {
  nodes: MapNode[];
  edges: MapEdge[];
  index: Map<string, number>;
};

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A float in [0, 1) from an integer seed. */
function rnd(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  // `^` yields a signed int32 in JS; re-cast, or this returns [-0.5, 0.5).
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

/**
 * `asOf` (ISO time) leaves out avatars made and runs recorded after it — how a
 * send freezes the map, so a late score cannot move anyone between emails.
 */
export function layoutMap(room: Room, asOf?: string): MapLayout {
  const cutoff = asOf ? Date.parse(asOf) : Infinity;
  const avatars = room.avatars.filter((a) => !(Date.parse(a.createdAt) > cutoff));
  const known = new Map(avatars.map((a) => [a.id, a]));
  const runs = room.runs.filter(
    (r) => known.has(r.a) && known.has(r.b) && r.a !== r.b && !(Date.parse(r.recordedAt) > cutoff),
  );

  // ---- aggregate ---------------------------------------------------------
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of runs) {
    lo = Math.min(lo, r.score);
    hi = Math.max(hi, r.score);
  }
  const normOf = (score: number) => (hi > lo ? (score - lo) / (hi - lo) : 1);

  const best = new Map<string, number>(); // avatar id → best norm
  // pair key → best run; insertion order is first-played order, since runs
  // arrive sorted by time.
  const links = new Map<string, { key: string; a: string; b: string; score: number }>();
  for (const r of runs) {
    const norm = normOf(r.score);
    for (const id of [r.a, r.b]) best.set(id, Math.max(best.get(id) ?? 0, norm));
    const key = [r.a, r.b].sort().join("|");
    const prev = links.get(key);
    if (!prev || r.score > prev.score) {
      links.set(key, { key, a: r.a, b: r.b, score: r.score });
    }
  }

  // ---- place -------------------------------------------------------------
  const k = clamp(Math.sqrt(C.comfortable / Math.max(avatars.length, 1)), C.minScale, 1);
  const spacing = C.minSpacing * k;
  const sepScale = 0.5 + 0.5 * k;

  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const index = new Map<string, number>();

  const M = C.margin;
  const xMin = M.left;
  const xMax = MAP_ASPECT - M.right;
  const yMin = M.top;
  const yMax = 1 - M.bottom;

  const radOf = (id: string) =>
    k * (best.has(id) ? lerp(C.radMin, C.radMax, 0.35 + best.get(id)! * 0.65) : C.radUnplayed);

  /** Free space around a spot, beyond both radii; -Infinity off the map. */
  const clearance = (p: { x: number; y: number }, rad: number) => {
    if (p.x < xMin || p.x > xMax || p.y < yMin || p.y > yMax) return -Infinity;
    let free = Infinity;
    for (const q of nodes) free = Math.min(free, Math.hypot(q.x - p.x, q.y - p.y) - rad - q.rad);
    return free;
  };
  const fits = (p: { x: number; y: number }, rad: number) => clearance(p, rad) > spacing;

  const randSpot = (s: number) => ({
    x: xMin + rnd(s) * (xMax - xMin),
    y: yMin + rnd(s + 1) * (yMax - yMin),
  });

  const addNode = (id: string, pos: { x: number; y: number }) => {
    const a = known.get(id)!;
    const played = best.has(id);
    nodes.push({
      id,
      owner: a.owner,
      name: a.name,
      x: clamp(pos.x, xMin, xMax),
      y: clamp(pos.y, yMin, yMax),
      rad: radOf(id),
      bri: played ? lerp(C.briLow, C.briHigh, best.get(id)!) : C.briUnplayed,
      played,
    });
    index.set(id, nodes.length - 1);
  };

  /**
   * Somewhere free, anywhere — and on a map too crowded for that, the roomiest
   * spot tried rather than a random one, so overlaps are the exception.
   */
  const anywhere = (id: string, seed: number) => {
    const rad = radOf(id);
    let roomiest = randSpot(seed);
    let most = -Infinity;
    for (let t = 0; t < C.placeTries; t++) {
      const cand = randSpot(seed + t * 2);
      const free = clearance(cand, rad);
      if (free > spacing) return cand;
      if (free > most) {
        most = free;
        roomiest = cand;
      }
    }
    return roomiest;
  };

  for (const link of links.values()) {
    const { a, b } = link;
    const norm = normOf(link.score);
    const sep = lerp(C.sepFar, C.sepNear, norm) * sepScale;
    const seed = hashString(link.key);
    const aIn = index.has(a);
    const bIn = index.has(b);

    if (!aIn && !bIn) {
      // A first pairing for both: a centre and an angle, both ends checked.
      const rA = radOf(a);
      const rB = radOf(b);
      // The first that fits, else the roomiest tried.
      let pair: [{ x: number; y: number }, { x: number; y: number }] | null = null;
      let most = -Infinity;
      for (let t = 0; t < C.placeTries; t++) {
        const c = randSpot(seed + t * 3);
        const angle = rnd(seed + t * 3 + 2) * TAU;
        const dx = (Math.cos(angle) * sep) / 2;
        const dy = (Math.sin(angle) * sep) / 2;
        const e0 = { x: c.x - dx, y: c.y - dy };
        const e1 = { x: c.x + dx, y: c.y + dy };
        const free = Math.min(clearance(e0, rA), clearance(e1, rB));
        if (free > most) {
          most = free;
          pair = [e0, e1];
        }
        if (free > spacing) break;
      }
      addNode(a, pair![0]);
      addNode(b, pair![1]);
    } else if (aIn !== bIn) {
      // The newcomer orbits their already-placed partner.
      const anchor = nodes[index.get(aIn ? a : b)!];
      const newcomer = aIn ? b : a;
      const rN = radOf(newcomer);
      let pos: { x: number; y: number } | null = null;
      for (let t = 0; t < C.placeTries && !pos; t++) {
        const angle = rnd(seed + t * 2) * TAU;
        const dist = sep * (1 + (rnd(seed + t * 2 + 1) * 0.4 * t) / C.placeTries);
        const cand = {
          x: anchor.x + Math.cos(angle) * dist,
          y: anchor.y + Math.sin(angle) * dist,
        };
        if (fits(cand, rN)) pos = cand;
      }
      addNode(newcomer, pos ?? anywhere(newcomer, seed + 500));
    }
    // Both already placed: nothing to place, only the link.

    edges.push({ a: index.get(a)!, b: index.get(b)!, score: link.score, norm });
  }

  // Everyone who never played, oldest first.
  for (const a of avatars) {
    if (!index.has(a.id)) addNode(a.id, anywhere(a.id, hashString(a.id)));
  }

  return { nodes, edges, index };
}

/** The avatars that belong to one participant. */
export function nodesOf(layout: MapLayout, owner: string): number[] {
  const out: number[] = [];
  layout.nodes.forEach((n, i) => {
    if (n.owner === owner) out.push(i);
  });
  return out;
}
