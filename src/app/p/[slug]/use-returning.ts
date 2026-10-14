"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { existingParticipant, spokeClient } from "@/lib/spoke/browser-client";
import { myAvatarIds } from "@/lib/spoke/avatars";

/**
 * Who is reading, on the pages a participant comes back to: the identity this
 * browser already holds with the tenant's Supabase, and the avatars it made.
 * Never signs anyone in — someone with no avatar here gets told so, not a new
 * anonymous account with nothing to show.
 */
export type Returning =
  | { status: "loading" }
  | { status: "none"; client: SupabaseClient }
  | { status: "ready"; client: SupabaseClient; avatarIds: string[] }
  | { status: "error"; client: SupabaseClient };

export function useReturning(
  supabaseUrl: string,
  publishableKey: string,
): Returning {
  const [state, setState] = useState<Returning>({ status: "loading" });

  useEffect(() => {
    // Made here rather than in render, so the server never builds one.
    const client = spokeClient(supabaseUrl, publishableKey);
    let cancelled = false;

    async function start() {
      const userId = await existingParticipant(client);
      if (cancelled) return;
      if (!userId) {
        setState({ status: "none", client });
        return;
      }
      try {
        const avatarIds = await myAvatarIds(client, userId);
        if (cancelled) return;
        setState(
          avatarIds.length > 0
            ? { status: "ready", client, avatarIds }
            : { status: "none", client },
        );
      } catch (e) {
        console.warn("[spoke] avatar read failed:", e);
        if (!cancelled) setState({ status: "error", client });
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [supabaseUrl, publishableKey]);

  return state;
}
