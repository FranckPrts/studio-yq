"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  setOpenForParticipation,
  type ParticipationState,
} from "./actions";

export default function ParticipationToggle({
  slug,
  open,
  canEdit,
  missing,
  publicUrl,
}: {
  slug: string;
  open: boolean;
  canEdit: boolean;
  missing: string[];
  publicUrl: string;
}) {
  const [state, action, pending] = useActionState<ParticipationState, FormData>(
    setOpenForParticipation,
    {},
  );
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm">
          {open
            ? "Open — participants can reach it."
            : "Closed — nothing is reachable by participants."}
        </span>
        {canEdit && (
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="open" value={open ? "false" : "true"} />
            <button
              type="submit"
              disabled={pending || (!open && missing.length > 0)}
              className="text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
            >
              {pending ? "…" : open ? "close" : "open"}
            </button>
          </form>
        )}
      </div>

      {open ? (
        <p className="text-[11px] text-dim">
          Participants go to{" "}
          <button
            type="button"
            onClick={copyLink}
            title="Copy link"
            className="text-paper/80 underline underline-offset-4 hover:text-paper"
          >
            {publicUrl}
          </button>
          <span aria-live="polite" className="ml-2 text-success">
            {copied ? "copied ✓" : ""}
          </span>
        </p>
      ) : missing.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-warning/80">
          Cannot open yet — still needs {missing.join(", and ")}.
        </p>
      ) : (
        <p className="text-[11px] text-dim">
          Ready to open. Participants will go to{" "}
          <code className="text-paper/60">{publicUrl}</code>.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-[11px] text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
