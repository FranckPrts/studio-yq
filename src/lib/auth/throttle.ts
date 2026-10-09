import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Throttles password guessing, by account and by network.
 *
 * Two keys, because each misses what the other catches: an account key stops
 * one address being hammered from many machines, an IP key stops one machine
 * trying many addresses. Both are counted in Postgres (see `AuthFailure`) so
 * the limit holds across every serverless instance.
 *
 * The windows slide: a subject is blocked while it has `limit` failures in the
 * last `WINDOW_MS`, and unblocks as the oldest of them ages out. Checking and
 * recording are separate queries, so two simultaneous guesses can overshoot a
 * limit by one — harmless at these numbers.
 *
 * The account limit can be used to lock someone out on purpose, by guessing
 * wrong in their name. That is the accepted price: the lock lasts at most one
 * window, and `npm run admin` clears it.
 */

const WINDOW_MS = 15 * 60 * 1000;

const LIMITS = {
  /** Generous for typos, hopeless for guessing a 12-character password. */
  account: 10,
  /**
   * Higher, since a whole team at one venue shares an address. Participants
   * never sign in here — they authenticate with the tenant's Supabase — so it
   * is only ever the people running projects.
   */
  ip: 30,
} as const;

type Scope = keyof typeof LIMITS;
export type ThrottleKey = { scope: Scope; hash: string };

function key(scope: Scope, value: string): ThrottleKey {
  return {
    scope,
    hash: createHash("sha256").update(`${scope}:${value}`).digest("hex"),
  };
}

/** Normalised the same way sign-in normalises it, or the keys would split. */
export function accountKey(email: string): ThrottleKey {
  return key("account", email.trim().toLowerCase());
}

/**
 * The caller's address, as the platform reports it. On Vercel the first
 * `x-forwarded-for` entry is set by Vercel itself and cannot be forged by the
 * client; behind a proxy that passes the header through untouched it could be,
 * which would only weaken this key, never the account one.
 */
async function ipKey(): Promise<ThrottleKey | null> {
  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip")?.trim();
  return ip ? key("ip", ip) : null;
}

/** The keys a password check against `email` counts towards. */
export async function throttleKeys(email: string): Promise<ThrottleKey[]> {
  const ip = await ipKey();
  return ip ? [accountKey(email), ip] : [accountKey(email)];
}

export type ThrottleState =
  | { blocked: false }
  | { blocked: true; retryAfterMinutes: number };

/** Whether any of these keys is over its limit, and if so for how long. */
export async function checkThrottle(
  keys: ThrottleKey[],
): Promise<ThrottleState> {
  const since = new Date(Date.now() - WINDOW_MS);
  let unblockAt = 0;

  for (const { scope, hash } of keys) {
    const limit = LIMITS[scope];
    const recent = await db.authFailure.findMany({
      where: { subjectHash: hash, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { createdAt: true },
    });
    if (recent.length < limit) continue;

    // The `limit`-th most recent failure is the one whose expiry brings the
    // count back under the limit.
    const frees = recent[limit - 1].createdAt.getTime() + WINDOW_MS;
    unblockAt = Math.max(unblockAt, frees);
  }

  if (!unblockAt) return { blocked: false };
  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil((unblockAt - Date.now()) / 60_000)),
  };
}

/** Counts one wrong password against every key, and prunes expired rows. */
export async function recordFailure(keys: ThrottleKey[]): Promise<void> {
  await db.$transaction([
    db.authFailure.createMany({
      data: keys.map(({ hash }) => ({ subjectHash: hash })),
    }),
    db.authFailure.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } },
    }),
  ]);
}

/**
 * Forgets an account's failures — after a correct password, or an admin
 * reset. The IP key is left alone: one success on a network does not vouch
 * for every other guess made from it.
 */
export async function clearFailures(key: ThrottleKey): Promise<void> {
  await db.authFailure.deleteMany({ where: { subjectHash: key.hash } });
}

/** One sentence, the same everywhere a password is checked. */
export function throttledMessage(state: { retryAfterMinutes: number }): string {
  const minutes = state.retryAfterMinutes;
  return `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
