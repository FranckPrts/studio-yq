"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The participant's own email address, in the tenant's `participant_contacts`.
 *
 * Unlike avatars, this table is private to each participant: RLS lets them
 * read and write their own row and nothing else, and the publishable key on
 * its own reads nothing at all. Researchers see the addresses in their
 * Supabase dashboard; they never pass through us.
 */

export const CONTACTS_TABLE = "participant_contacts";

/** Lowercased and trimmed, the same normalisation our own accounts use. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** The address this participant gave before, if any. */
export async function myEmail(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(CONTACTS_TABLE)
    .select("email")
    .eq("owner", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return typeof data?.email === "string" ? data.email : null;
}

/**
 * Stores the address, or clears it when blank — an optional field emptied on a
 * second visit means "forget it", not "keep the old one".
 *
 * Update first, insert only if there was no row: there is no unique-violation
 * dance on a second save, and `owner` never has to be sent — the column
 * defaults to auth.uid(), and the grant does not allow writing it anyway.
 */
export async function saveEmail(
  client: SupabaseClient,
  userId: string,
  value: string,
): Promise<void> {
  const email = normalizeEmail(value) || null;

  const { data, error } = await client
    .from(CONTACTS_TABLE)
    .update({ email })
    .eq("owner", userId)
    .select("owner");
  if (error) throw new Error(error.message);
  if (data && data.length > 0) return;

  // No row yet, and nothing to record: leave no trace of a skipped question.
  if (email === null) return;

  const inserted = await client.from(CONTACTS_TABLE).insert({ email });
  if (inserted.error) throw new Error(inserted.error.message);
}
