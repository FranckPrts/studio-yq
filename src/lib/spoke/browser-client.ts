"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The participant's connection — straight from their browser to the tenant's
 * Supabase, with no server of ours in between.
 *
 * This is decision 2 in practice: the publishable key is public by design, RLS
 * is the boundary, and cutting out the relay is what lets Realtime work
 * natively. Nothing here is a secret; the interesting security lives in the
 * policies we provisioned.
 *
 * The one exception is a lost session, below: handing a participant's avatars
 * to a new identity takes the secret key, so that alone goes through our server.
 */

const clients = new Map<string, SupabaseClient>();
/** Where each client keeps its copy of the last session — see `Kept`. */
const keepKeys = new WeakMap<SupabaseClient, string>();

export function spokeClient(
  projectUrl: string,
  publishableKey: string,
): SupabaseClient {
  const existing = clients.get(projectUrl);
  if (existing) return existing;

  // Namespaced per project. Two experiences open in the same browser are two
  // different Supabase projects and two different anonymous identities; a
  // shared key would have one silently evict the other.
  const storageKey = `yq-spoke-${new URL(projectUrl).hostname.split(".")[0]}`;
  const client = createClient(projectUrl, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey },
  });

  const keepKey = `${storageKey}-kept`;
  keepKeys.set(client, keepKey);
  // Written on every sign-in and refresh, and never cleared on sign-out: the
  // whole point is to outlive supabase-js dropping the session. The callback
  // only touches storage — awaiting the client from inside it can deadlock.
  client.auth.onAuthStateChange((_event, session) => {
    if (!session?.user?.id) return;
    writeKept(keepKey, {
      userId: session.user.id,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  });

  clients.set(projectUrl, client);
  return client;
}

/**
 * The last session this browser held, kept apart from supabase-js's own copy.
 *
 * A participant may spend minutes on the form — long enough on a phone for the
 * screen to lock, token refresh to pause, and the refresh on waking to fail.
 * supabase-js then drops the session without a word; the next request goes
 * out with only the publishable key, Postgres sees `anon`, and the participant
 * reads "permission denied for table avatars". With a new identity, everything
 * the old one made is out of reach. This copy is how they get it back:
 *
 * 1. The refresh token may still be good — the drop is not always Supabase's
 *    decision — and then the very same identity is restored.
 * 2. If not, the access token, though expired, is still signed by the tenant's
 *    Supabase: proof that this browser was that participant. Our server checks
 *    it and hands the old identity's avatars to the new one.
 *
 * It holds nothing supabase-js's own storage did not already hold.
 */
type Kept = { userId: string; accessToken: string; refreshToken: string };

function readKept(key: string | undefined): Kept | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    const kept = raw ? (JSON.parse(raw) as Partial<Kept>) : null;
    return kept?.userId && kept.accessToken && kept.refreshToken
      ? (kept as Kept)
      : null;
  } catch {
    return null;
  }
}

function writeKept(key: string, kept: Kept): void {
  try {
    localStorage.setItem(key, JSON.stringify(kept));
  } catch {
    // Private mode or storage full: recovery is a bonus, not a requirement.
  }
}

/**
 * Brings back the identity this browser last held, if its refresh token is
 * still good. Null when it is not, or there was none.
 */
async function restoreKept(
  client: SupabaseClient,
  kept: Kept | null,
): Promise<string | null> {
  if (!kept) return null;
  const { data, error } = await client.auth.refreshSession({
    refresh_token: kept.refreshToken,
  });
  if (error || data.session?.user?.id !== kept.userId) return null;
  return kept.userId;
}

/**
 * Asks our server to move the old identity's avatars, and its email address,
 * to the identity now signed in. Never fatal: if it fails, they simply start
 * over as before.
 */
async function handOver(
  client: SupabaseClient,
  slug: string,
  kept: Kept,
): Promise<boolean> {
  try {
    const { data } = await client.auth.getSession();
    const current = data.session;
    if (!current || current.user.id === kept.userId) return false;
    const response = await fetch(
      `/api/p/${encodeURIComponent(slug)}/handover`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${current.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: kept.accessToken }),
      },
    );
    if (!response.ok) {
      console.warn("[spoke] handover refused:", response.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[spoke] handover failed:", e);
    return false;
  }
}

export type Participant =
  | {
      userId: string;
      /** Signed in afresh, with the old identity's avatars handed over. */
      handedOver?: boolean;
    }
  | { error: string };

/**
 * Returns the participant's user id — the identity this browser already holds,
 * one brought back from `Kept`, or a new anonymous one.
 *
 * Called when the page loads *and* again just before every write, because the
 * session can lapse in between. `getSession` refreshes an expired token on its
 * own; a refresh that failed for want of a network is reported, never replaced
 * by a new identity.
 *
 * An anonymous Supabase user is still an *authenticated* one: they carry a JWT
 * and a real `auth.uid()`, which is exactly what the RLS policies key off.
 * Losing browser storage altogether still means losing the avatar, the same
 * tradeoff the old localStorage UUID had.
 */
export async function ensureParticipant(
  client: SupabaseClient,
  slug: string,
): Promise<Participant> {
  const { data: existing, error: sessionError } =
    await client.auth.getSession();
  if (existing.session?.user?.id) {
    return { userId: existing.session.user.id };
  }
  if (sessionError) {
    console.warn("[spoke] session refresh failed:", sessionError);
    return { error: participantMessage(sessionError) };
  }

  // Read before signing in: the new session overwrites it.
  const kept = readKept(keepKeys.get(client));
  const restored = await restoreKept(client, kept);
  if (restored) return { userId: restored };

  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    // Keep the real thing for whoever is debugging…
    if (error) console.warn("[spoke] anonymous sign-in failed:", error);
    // …and give the participant a sentence. Supabase's own messages are for
    // developers — "Failed to fetch" tells someone at an event nothing, and
    // the two causes that actually happen have very different answers.
    return { error: participantMessage(error) };
  }
  const handedOver = kept ? await handOver(client, slug, kept) : false;
  return { userId: data.user.id, handedOver };
}

/**
 * The participant's user id if this browser has, or had, one — without making
 * a stranger of anyone. For the pages a participant comes back to read
 * (results, the conclusion), where a fresh anonymous identity would have
 * nothing to show and spend a sign-in from a room that shares one rate limit.
 *
 * A lapsed session is recovered as `ensureParticipant` would: restored if it
 * can be, otherwise signed in afresh *only* because there is an old identity
 * to hand over.
 */
export async function existingParticipant(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;
  if (error) return null;

  const kept = readKept(keepKeys.get(client));
  if (!kept) return null;
  const restored = await restoreKept(client, kept);
  if (restored) return restored;

  const participant = await ensureParticipant(client, slug);
  return "userId" in participant && participant.handedOver
    ? participant.userId
    : null;
}

function participantMessage(error: { message?: string; status?: number } | null): string {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("fetch") || message.includes("network")) {
    return "Can’t reach this experience’s database. Check your connection and try again.";
  }
  // The one that bites at events: anonymous sign-ins are rate-limited per IP,
  // and a room full of people shares one.
  if (error?.status === 429 || message.includes("rate limit")) {
    return "Too many people have joined from this network in the last hour. Wait a few minutes and try again.";
  }
  if (message.includes("anonymous") || message.includes("disabled")) {
    return "This experience isn’t accepting new participants yet.";
  }
  return "Couldn’t start. Try reloading the page.";
}
