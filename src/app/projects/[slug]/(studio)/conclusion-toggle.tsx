"use client";

import { useActionState } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import {
  setConclusionPublished,
  type ParticipationState,
} from "./actions";
import { buttonClass } from "@/design";

/**
 * The conclusion's own switch, under participation: hidden while the event
 * runs, published once it is over. While hidden, participants see no link to
 * it, and its address says it isn't out yet.
 */
export default function ConclusionToggle({
  slug,
  publishedAt,
  open,
  canEdit,
  conclusionUrl,
}: {
  slug: string;
  /** ISO time it was published; null while held back. */
  publishedAt: string | null;
  /** Whether the project itself is open — the conclusion is behind that too. */
  open: boolean;
  canEdit: boolean;
  conclusionUrl: string;
}) {
  const [state, action, pending] = useActionState<ParticipationState, FormData>(
    setConclusionPublished,
    {},
  );
  const published = publishedAt !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm">
          {published ? (
            <>
              Conclusion published — since{" "}
              {/* The server renders in its own time zone, the browser in the
                  reader's; the browser's wins. */}
              <time dateTime={publishedAt} suppressHydrationWarning>
                {new Date(publishedAt).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              .
            </>
          ) : (
            "Conclusion hidden — for after the event."
          )}
        </span>
        {canEdit && (
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="publish" value={published ? "false" : "true"} />
            <button
              type="submit"
              disabled={pending}
              className={buttonClass("boxed")}
            >
              {pending ? "…" : published ? "hide" : "publish"}
            </button>
          </form>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-dim">
        {published ? (
          open ? (
            <>
              Participants see a link to it from their list and their results,
              at <code className="text-paper/60">{conclusionUrl}</code>.{" "}
              <CopyLinkButton url={conclusionUrl} className="ml-1" />
            </>
          ) : (
            "Published, but the project is closed — participants reach it once the project is open."
          )
        ) : (
          "Participants see no link to it, and its address says it isn’t out yet. Every run’s score, and who did best, appear once it is published."
        )}
      </p>

      {state.error && (
        <p role="alert" className="text-[11px] text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
