import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import {
  aadFor,
  decryptSecret,
  UnreadableSecretError,
} from "@/lib/crypto/envelope";
import { TABLES } from "./schema";

/**
 * Operating a live experience, from our server, with the tenant's secret key.
 *
 * Only *writes* come through here. Reads do not need to: provisioning made
 * `avatars` and `session_scores` readable with the publishable key — the scene
 * and the participants rely on that — so the console reads and subscribes to
 * Realtime straight from the browser. Relaying those reads through our server
 * would add a long-lived connection per viewer and protect nothing.
 *
 * Staging is different. It changes what the scene puts on stage, so it is
 * authorised against project membership first, and made with the secret key,
 * which never leaves this module. So is correcting a session afterwards: the
 * provisioned schema gives the publishable key no update or delete on scores
 * at all, deliberately, so only this path can change one.
 */

/** The scene renders a pair, and takes the first two staged by `updated_at`. */
export const MAX_STAGED = 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Said to the operator mid-event, so it leads with what is *not* wrong. */
const NEEDS_RECONNECT =
  "This project's Supabase connection needs renewing — an owner can reconnect it on the database page. Nothing in your Supabase project is lost.";

/** Null when the stored secret no longer opens — see `UnreadableSecretError`. */
async function opsClient(projectId: string): Promise<SupabaseClient | null> {
  const connection = await db.supabaseConnection.findUnique({
    where: { projectId },
    select: {
      id: true,
      projectUrl: true,
      secretKeyEnc: true,
      keyVersion: true,
    },
  });
  if (!connection?.projectUrl || !connection.secretKeyEnc) {
    throw new Error("This project has no database connection with a secret key.");
  }

  let secret: string;
  try {
    secret = decryptSecret(
      connection.secretKeyEnc,
      aadFor(connection.id, "secretKey"),
      connection.keyVersion,
    );
  } catch (error) {
    if (error instanceof UnreadableSecretError) return null;
    throw error;
  }

  // Built per call and never cached: holding a decrypted service key in module
  // state would outlive the request that needed it.
  return createClient(connection.projectUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type OpsResult = { ok: true } | { ok: false; error: string };

/**
 * Stages or un-stages one avatar.
 *
 * The pair limit is a check-then-write, not a lock: two operators staging in the
 * same second could briefly put three on stage. Accepted, because the scene is
 * already robust to it — it takes the first two by `updated_at` — and an ops
 * console run by one or two people at an event does not justify a stored
 * procedure in the tenant's database.
 */
export async function setStaged(
  projectId: string,
  avatarId: string,
  staged: boolean,
): Promise<OpsResult> {
  if (!UUID.test(avatarId)) return { ok: false, error: "Unknown avatar." };
  const client = await opsClient(projectId);
  if (!client) return { ok: false, error: NEEDS_RECONNECT };

  if (staged) {
    const { count, error } = await client
      .from(TABLES.avatars)
      .select("id", { count: "exact", head: true })
      .eq("is_staged", true)
      .neq("id", avatarId);
    if (error) return { ok: false, error: error.message };
    if ((count ?? 0) >= MAX_STAGED) {
      return {
        ok: false,
        error: `Two are already on stage. Take one off first.`,
      };
    }
  }

  const { error } = await client
    .from(TABLES.avatars)
    .update({ is_staged: staged })
    .eq("id", avatarId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function unstageAll(projectId: string): Promise<OpsResult> {
  const client = await opsClient(projectId);
  if (!client) return { ok: false, error: NEEDS_RECONNECT };
  const { error } = await client
    .from(TABLES.avatars)
    .update({ is_staged: false })
    .eq("is_staged", true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** What the experimenter may correct on a session the scene recorded. */
export type ScoreEdit = {
  strategy: string | null;
  score: number;
  duration: number | null;
};

/** Gone already is not the operator's mistake, so it says what happened. */
const SCORE_GONE = "That session is no longer there — someone may have deleted it.";

export async function updateScore(
  projectId: string,
  scoreId: string,
  edit: ScoreEdit,
): Promise<OpsResult> {
  if (!UUID.test(scoreId)) return { ok: false, error: "Unknown session." };
  const client = await opsClient(projectId);
  if (!client) return { ok: false, error: NEEDS_RECONNECT };

  // `select` so that an update matching no row reads as an error rather than
  // a silent success.
  const { data, error } = await client
    .from(TABLES.scores)
    .update(edit)
    .eq("id", scoreId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  return data?.length ? { ok: true } : { ok: false, error: SCORE_GONE };
}

export async function deleteScore(
  projectId: string,
  scoreId: string,
): Promise<OpsResult> {
  if (!UUID.test(scoreId)) return { ok: false, error: "Unknown session." };
  const client = await opsClient(projectId);
  if (!client) return { ok: false, error: NEEDS_RECONNECT };

  const { data, error } = await client
    .from(TABLES.scores)
    .delete()
    .eq("id", scoreId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  return data?.length ? { ok: true } : { ok: false, error: SCORE_GONE };
}

// ─── Participant report sending ─────────────────────────────────────────────
//
// The only reads of `participant_contacts` anywhere in studio-yq, and only for
// sending: the table is private to each participant, so it takes the secret
// key. Callers must have checked the project's acknowledgement of the
// pass-through notice first. An address read here goes to Gmail and nowhere
// else — never into our database, a log line, or a response.

/** The participant's address, or null when they gave none. */
export async function participantEmail(
  projectId: string,
  owner: string,
): Promise<string | null> {
  if (!UUID.test(owner)) return null;
  const client = await opsClient(projectId);
  if (!client) throw new Error(NEEDS_RECONNECT);
  const { data, error } = await client
    .from(TABLES.contacts)
    .select("email")
    .eq("owner", owner)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return typeof data?.email === "string" && data.email ? data.email : null;
}

/**
 * Participants who can be sent a report: an address on file and at least one
 * avatar made by `before`. Ids only — the addresses are not selected at all.
 */
export async function reachableOwners(
  projectId: string,
  before: Date,
): Promise<string[]> {
  const client = await opsClient(projectId);
  if (!client) throw new Error(NEEDS_RECONNECT);
  const [contacts, avatars] = await Promise.all([
    client.from(TABLES.contacts).select("owner").not("email", "is", null).range(0, 9999),
    client
      .from(TABLES.avatars)
      .select("owner")
      .lte("created_at", before.toISOString())
      .range(0, 9999),
  ]);
  if (contacts.error) throw new Error(contacts.error.message);
  if (avatars.error) throw new Error(avatars.error.message);
  const withAvatar = new Set((avatars.data ?? []).map((r) => String(r.owner)));
  return [...new Set((contacts.data ?? []).map((r) => String(r.owner)))].filter((o) =>
    withAvatar.has(o),
  );
}
