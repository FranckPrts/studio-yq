"use client";

import { useActionState, useState } from "react";
import { deleteProject, type DeleteState } from "./actions";
import { buttonClass } from "@/design";

/**
 * Deleting a project, behind a typed confirmation. Lists what this removes and,
 * just as plainly, what it leaves for the person to do elsewhere — we delete
 * our own records only.
 */
export default function DeleteSection({
  slug,
  open,
  supabaseRef,
  gmailAddress,
}: {
  slug: string;
  open: boolean;
  /** The tenant's Supabase project, when one is connected. */
  supabaseRef: string | null;
  gmailAddress: string | null;
}) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(
    deleteProject,
    {},
  );
  const [confirm, setConfirm] = useState("");

  return (
    <details className="group rounded bg-danger-surface p-4 text-xs">
      <summary className="cursor-pointer text-danger">delete this project</summary>

      <div className="mt-4 flex flex-col gap-4 leading-relaxed">
        <div className="flex flex-col gap-1">
          <p className="text-paper/90">Removed from Studio, for good:</p>
          <ul className="list-disc pl-5 text-dim">
            <li>the project, its settings, wording and report templates</li>
            <li>every script and mini-script version</li>
            <li>its members and open invitations</li>
            <li>the stored Supabase and Gmail credentials</li>
            <li>the record of report emails sent</li>
            <li>
              the participant address <code>/p/{slug}</code>, which stops
              working and becomes free for another project
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-paper/90">Not touched — yours to do, if you want them gone:</p>
          <ul className="list-disc pl-5 text-dim">
            <li>
              {supabaseRef ? (
                <>
                  Your Supabase project <code>{supabaseRef}</code> keeps every
                  participant, avatar, score and email address. Delete it, or its
                  tables, from the Supabase dashboard.
                </>
              ) : (
                <>No Supabase project is connected, so there is nothing there.</>
              )}
            </li>
            {supabaseRef && (
              <li>
                Studio&rsquo;s access to your Supabase account stays authorised.
                Revoke it in Supabase under your organisation&rsquo;s settings,
                authorised apps.
              </li>
            )}
            {gmailAddress && (
              <li>
                Studio may still send as <code>{gmailAddress}</code>. Revoke it
                at myaccount.google.com → Security → third-party access.
              </li>
            )}
            {supabaseRef && (
              <li>
                A YouQuantified scene with this project&rsquo;s key in its
                CONFIG keeps writing to that Supabase project until you change
                it.
              </li>
            )}
          </ul>
        </div>

        {open ? (
          <p className="text-warning">
            Close the project to participants before deleting it.
          </p>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="slug" value={slug} />
            <label className="flex flex-col gap-1">
              <span className="text-dim">
                type <code className="text-paper/90">{slug}</code> to confirm
              </span>
              <input
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="term-input max-w-sm rounded bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            {state.error && (
              <p role="alert" className="text-danger">
                {state.error}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={pending || confirm.trim() !== slug}
                className={buttonClass("boxed", undefined, undefined, "danger")}
              >
                {pending ? "deleting…" : "delete project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
