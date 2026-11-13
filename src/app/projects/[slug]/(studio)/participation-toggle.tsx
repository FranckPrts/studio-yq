"use client";

import { useActionState } from "react";
import {
  setOpenForParticipation,
  type ParticipationState,
} from "./actions";
import { buttonClass } from "@/design";
import CopyLinkButton from "@/components/CopyLinkButton";
import { qrImagePath } from "@/lib/app-url";
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
          <QrLinks slug={slug} />
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
          <QrLinks slug={slug} />
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

/**
 * The participation link as a QR code: PNG for slides, SVG for print, and the
 * full-screen page for a tablet at the door. Downloadable before the project
 * opens — the page itself says "closed" until then.
 */
function QrLinks({ slug }: { slug: string }) {
  const link =
    "text-dim underline-offset-4 hover:text-paper hover:underline";
  return (
    <span className="ml-2 inline-flex items-baseline gap-2 align-middle">
      <span className="text-dim">QR:</span>
      <a href={qrImagePath(slug, "png", true)} download className={link}>
        png
      </a>
      <a href={qrImagePath(slug, "svg", true)} download className={link}>
        svg
      </a>
      <a href={`/p/${slug}/qr`} target="_blank" rel="noopener" className={link}>
        full screen ↗
      </a>
    </span>
  );
}
