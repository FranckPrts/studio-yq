"use client";

import { useActionState } from "react";
import {
  setOpenForParticipation,
  type ParticipationState,
} from "./actions";
import { buttonClass } from "@/design";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { ReadinessWarning } from "@/lib/projects/readiness";

export default function ParticipationToggle({
  slug,
  open,
  canEdit,
  missing,
  warnings,
  publicUrl,
}: {
  slug: string;
  open: boolean;
  canEdit: boolean;
  missing: string[];
  /** Shown but never blocking — see `projectReadiness`. */
  warnings: ReadinessWarning[];
  publicUrl: string;
}) {
  const [state, action, pending] = useActionState<ParticipationState, FormData>(
    setOpenForParticipation,
    {},
  );
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
              className={buttonClass("boxed")}
            >
              {pending ? "…" : open ? "close" : "open"}
            </button>
          </form>
        )}
      </div>

      {open ? (
        <p className="text-[11px] text-dim">
          Participants go to{" "}
          <code className="text-paper/80">{publicUrl}</code>{" "}
          <CopyLinkButton url={publicUrl} className="ml-1" />
        </p>
      ) : missing.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-warning/80">
          Cannot open yet — still needs {missing.join(", and ")}.
        </p>
      ) : (
        <p className="text-[11px] text-dim">
          Ready to open. Participants will go to{" "}
          <code className="text-paper/60">{publicUrl}</code>.{" "}
          <CopyLinkButton url={publicUrl} className="ml-1" />
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-[11px] leading-relaxed text-warning/80">
          {warnings.map((w) => (
            <li key={w.text}>Check: {w.text}.</li>
          ))}
        </ul>
      )}

      {state.error && (
        <p role="alert" className="text-[11px] text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
