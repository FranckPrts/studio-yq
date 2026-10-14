"use client";

import { useActionState, useRef, useState } from "react";
import type { Parameter } from "@/lib/params/types";
import {
  CONDITIONALS,
  DEFAULT_REPORT_EMAIL,
  IMAGE_BLOCKS,
  IMAGE_DESCRIPTIONS,
  PLACEHOLDERS,
  REPORT_EMAIL_LIMITS,
  type ReportEmail,
} from "@/lib/report/email-template";
import type { RoomDatabase } from "@/lib/report/room";
import type { FontKey } from "@/lib/theme/project-theme";
import { useUnsavedChanges } from "../../use-unsaved-changes";
import type { ReportScriptInfo } from "../use-report-room";
import { saveReportEmail, type EmailSaveState } from "./actions";
import EmailPreview from "./email-preview";

const FIELDS: (keyof ReportEmail)[] = ["subject", "senderName", "replyTo", "look", "body"];

function submitted(formData: FormData): ReportEmail {
  return {
    subject: String(formData.get("subject") ?? ""),
    senderName: String(formData.get("senderName") ?? ""),
    replyTo: String(formData.get("replyTo") ?? ""),
    look: formData.get("look") === "project" ? "project" : "plain",
    body: String(formData.get("body") ?? ""),
  };
}

/**
 * The report email's wording on the left, and the email it makes on the right —
 * redrawn from the unsaved draft as it is typed, for whichever participant is
 * picked.
 */
export default function EmailEditor({
  slug,
  canEdit,
  initial,
  projectName,
  theme,
  noun,
  nounPlural,
  answerKeys,
  parameters,
  script,
  database,
}: {
  slug: string;
  canEdit: boolean;
  initial: ReportEmail;
  projectName: string;
  theme: { void: string; paper: string; dim: string; font: FontKey; fontStack: string };
  noun: string;
  nounPlural: string;
  answerKeys: string[];
  parameters: Parameter[];
  script: ReportScriptInfo | null;
  database: RoomDatabase | null;
}) {
  const [saved, setSaved] = useState<ReportEmail>(initial);
  const [draft, setDraft] = useState<ReportEmail>(initial);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState<EmailSaveState, FormData>(
    async (prev, formData) => {
      const result = await saveReportEmail(prev, formData);
      if (result.saved) setSaved(submitted(formData));
      return result;
    },
    {},
  );

  const dirty = FIELDS.some((key) => draft[key] !== saved[key]);
  useUnsavedChanges(dirty);

  const set = (update: Partial<ReportEmail>) => setDraft((d) => ({ ...d, ...update }));

  /**
   * Puts a token at the cursor — or around the selection, for a conditional or
   * formatting. `back` leaves the caret that many characters before the end,
   * e.g. inside a link's "(https://)" ready for the address.
   */
  function insert(open: string, close = "", back = 0) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const next = value.slice(0, a) + open + value.slice(a, b) + close + value.slice(b);
    set({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      const caret = a + open.length + (b - a) + close.length - back;
      el.setSelectionRange(caret, caret);
    });
  }

  const chip =
    "rounded border border-paper/15 px-1.5 py-0.5 font-mono text-[11px] text-paper/80 hover:border-paper/40 hover:text-paper disabled:opacity-40";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="slug" value={slug} />
        <fieldset disabled={!canEdit} className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                type="submit"
                disabled={pending || !dirty}
                className="text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
              >
                {pending ? "saving…" : "save email"}
              </button>
            )}
            {state.error ? (
              <p role="alert" className="text-xs text-danger">
                {state.error}
              </p>
            ) : dirty ? (
              <p className="text-xs text-warning/80">unsaved changes</p>
            ) : state.saved ? (
              <p className="text-xs text-dim">saved</p>
            ) : (
              !canEdit && <p className="text-xs text-dim">You have read-only access to this project.</p>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">subject</span>
            <input
              name="subject"
              value={draft.subject}
              maxLength={REPORT_EMAIL_LIMITS.subject}
              onChange={(e) => set({ subject: e.target.value })}
              className="term-input border-b border-paper/20 text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-dim">sender name</span>
              <input
                name="senderName"
                value={draft.senderName}
                maxLength={REPORT_EMAIL_LIMITS.senderName}
                placeholder={projectName}
                onChange={(e) => set({ senderName: e.target.value })}
                className="term-input border-b border-paper/20 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-dim">reply-to (optional)</span>
              <input
                name="replyTo"
                type="email"
                value={draft.replyTo}
                maxLength={REPORT_EMAIL_LIMITS.replyTo}
                placeholder="the sending account"
                onChange={(e) => set({ replyTo: e.target.value })}
                className="term-input border-b border-paper/20 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-dim">look</span>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {(
                [
                  ["plain", "plain — white, like an email someone typed"],
                  ["project", "the project's colours"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="look"
                    value={value}
                    checked={draft.look === value}
                    onChange={() => set({ look: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between text-xs text-dim">
              body
              {canEdit && draft.body !== DEFAULT_REPORT_EMAIL.body && (
                <button
                  type="button"
                  onClick={() => set({ body: DEFAULT_REPORT_EMAIL.body })}
                  className="underline-offset-4 hover:text-paper hover:underline"
                >
                  restore the default text
                </button>
              )}
            </span>
            <textarea
              ref={bodyRef}
              name="body"
              rows={22}
              maxLength={REPORT_EMAIL_LIMITS.body}
              value={draft.body}
              onChange={(e) => set({ body: e.target.value })}
              className="term-input resize-y border border-paper/15 p-3 font-mono text-[13px] leading-relaxed"
            />
          </label>
        </fieldset>

        <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-dim">
          <p>
            Click to insert at the cursor. Line breaks are kept; a blank line
            starts a new paragraph. <code>**bold**</code>, <code>*italic*</code>,{" "}
            <code>[link text](https://…)</code> (or <code>mailto:</code>, or an
            address pasted on its own), <code>- </code> lists and{" "}
            <code>&gt; </code> quotes work; anything else is plain text, never
            HTML.
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-paper/70">about them</span>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.description}
                  disabled={!canEdit}
                  onClick={() => insert(`{${p.key}}`)}
                  className={chip}
                >
                  {`{${p.key}}`}
                </button>
              ))}
              {answerKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  title="Their answer to this question"
                  disabled={!canEdit}
                  onClick={() => insert(`{${key}}`)}
                  className={chip}
                >
                  {`{${key}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-paper/70">formatting — wraps the selection</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                title="Turns the selected words into a link; replace https:// with the address"
                disabled={!canEdit}
                onClick={() => insert("[", "](https://)", 1)}
                className={chip}
              >
                [link](https://…)
              </button>
              <button
                type="button"
                title="Bold"
                disabled={!canEdit}
                onClick={() => insert("**", "**")}
                className={chip}
              >
                **bold**
              </button>
              <button
                type="button"
                title="Italic"
                disabled={!canEdit}
                onClick={() => insert("*", "*")}
                className={chip}
              >
                *italic*
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-paper/70">pictures — each on a line of its own</span>
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_BLOCKS.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={IMAGE_DESCRIPTIONS[key]}
                  disabled={!canEdit}
                  onClick={() => insert(`\n\n{${key}}\n\n`)}
                  className={chip}
                >
                  {`{${key}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-paper/70">only for some — wraps the selection</span>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONALS.map((c) => (
                <button
                  key={c.open}
                  type="button"
                  title={c.description}
                  disabled={!canEdit}
                  onClick={() => insert(`${c.open}\n`, `\n${c.close}`)}
                  className={chip}
                >
                  {`${c.open}…${c.close}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      <EmailPreview
        draft={draft}
        projectName={projectName}
        theme={theme}
        noun={noun}
        nounPlural={nounPlural}
        answerKeys={answerKeys}
        parameters={parameters}
        script={script}
        database={database}
      />
    </div>
  );
}
