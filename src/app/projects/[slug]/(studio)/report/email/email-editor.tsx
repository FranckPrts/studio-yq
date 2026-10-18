"use client";

import { useActionState, useState } from "react";
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
import TemplateField, { CONDITIONAL_CHIPS, FORMATTING } from "../template-field";
import { buttonClass } from "@/design";

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
                className={buttonClass("boxed")}
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
              className="term-input rounded bg-surface px-2 py-1.5 text-sm"
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
                className="term-input rounded bg-surface px-2 py-1.5 text-sm"
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
                className="term-input rounded bg-surface px-2 py-1.5 text-sm"
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

          <TemplateField
            name="body"
            label="body"
            value={draft.body}
            defaultValue={DEFAULT_REPORT_EMAIL.body}
            onChange={(body) => set({ body })}
            canEdit={canEdit}
            rows={22}
            maxLength={REPORT_EMAIL_LIMITS.body}
            syntax={
              <>
                Click to insert at the cursor. Line breaks are kept; a blank line
                starts a new paragraph. <code>**bold**</code>, <code>*italic*</code>,{" "}
                <code>[link text](https://…)</code> (or <code>mailto:</code>, or an
                address pasted on its own), <code>- </code> lists and{" "}
                <code>&gt; </code> quotes work; anything else is plain text, never
                HTML.
              </>
            }
            groups={[
              {
                label: "about them",
                chips: [
                  ...PLACEHOLDERS.map((p) => ({
                    label: `{${p.key}}`,
                    title: p.description,
                    open: `{${p.key}}`,
                  })),
                  ...answerKeys.map((key) => ({
                    label: `{${key}}`,
                    title: "Their answer to this question",
                    open: `{${key}}`,
                  })),
                ],
              },
              FORMATTING,
              {
                label: "pictures — each on a line of its own",
                chips: IMAGE_BLOCKS.map((key) => ({
                  label: `{${key}}`,
                  title: IMAGE_DESCRIPTIONS[key],
                  open: `\n\n{${key}}\n\n`,
                })),
              },
              CONDITIONAL_CHIPS(CONDITIONALS),
            ]}
          />
        </fieldset>
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
