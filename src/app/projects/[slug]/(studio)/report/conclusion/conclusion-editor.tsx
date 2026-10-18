"use client";

import { useActionState, useState } from "react";
import {
  CONCLUSION_BLOCKS,
  CONCLUSION_BLOCK_DESCRIPTIONS,
  CONCLUSION_LIMITS,
  CONCLUSION_PLACEHOLDERS,
  DEFAULT_CONCLUSION_PAGE,
  type ConclusionPage,
} from "@/lib/report/conclusion-template";
import { CONDITIONALS } from "@/lib/report/email-template";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import type { PreviewScreen } from "@/app/projects/[slug]/preview-frame/protocol";
import PreviewFrame, { DEVICES, type Device } from "../../participant-frontend/frame";
import { useUnsavedChanges } from "../../use-unsaved-changes";
import TemplateField, { CONDITIONAL_CHIPS, FORMATTING } from "../template-field";
import { saveConclusionPage, type ConclusionSaveState } from "./actions";
import { buttonClass } from "@/design";

const FIELDS: (keyof ConclusionPage)[] = ["body", "empty", "pending"];

const SCREENS: { key: PreviewScreen; label: string }[] = [
  { key: "conclusion", label: "published" },
  { key: "conclusionEmpty", label: "before the first score" },
  { key: "conclusionPending", label: "not published yet" },
];

function submitted(formData: FormData): ConclusionPage {
  return {
    body: String(formData.get("body") ?? ""),
    empty: String(formData.get("empty") ?? ""),
    pending: String(formData.get("pending") ?? ""),
  };
}

/**
 * The conclusion's template on the left, and the participant page it makes on
 * the right — the real page in the preview frame, fed made-up runs and the
 * unsaved draft, read either by someone who played or by a visitor.
 */
export default function ConclusionEditor({
  slug,
  canEdit,
  initial,
  theme,
  lexicon,
  copy,
}: {
  slug: string;
  canEdit: boolean;
  initial: ConclusionPage;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
}) {
  const [saved, setSaved] = useState<ConclusionPage>(initial);
  const [draft, setDraft] = useState<ConclusionPage>(initial);
  const [screen, setScreen] = useState<PreviewScreen>("conclusion");
  const [played, setPlayed] = useState(true);
  const [device, setDevice] = useState<Device>("phone");
  const [state, action, pending] = useActionState<ConclusionSaveState, FormData>(
    async (prev, formData) => {
      const result = await saveConclusionPage(prev, formData);
      if (result.saved) setSaved(submitted(formData));
      return result;
    },
    {},
  );

  const dirty = FIELDS.some((key) => draft[key] !== saved[key]);
  useUnsavedChanges(dirty);

  const set = (update: Partial<ConclusionPage>) => setDraft((d) => ({ ...d, ...update }));

  const tab = (active: boolean) =>
    `-mb-px border-b pb-2 text-xs ${
      active ? "border-paper text-paper" : "border-transparent text-dim hover:text-paper"
    }`;
  const toggle = (active: boolean) =>
    active ? "text-paper underline underline-offset-4" : "text-dim hover:text-paper";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                {pending ? "saving…" : "save conclusion"}
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

          <TemplateField
            name="body"
            label="page"
            value={draft.body}
            defaultValue={DEFAULT_CONCLUSION_PAGE.body}
            onChange={(body) => set({ body })}
            canEdit={canEdit}
            rows={22}
            maxLength={CONCLUSION_LIMITS.body}
            syntax={
              <>
                The same writing as the email, plus headings. Click to insert at
                the cursor. A blank line starts a new paragraph;{" "}
                <code># </code> and <code>## </code> start a heading,{" "}
                <code>**bold**</code>, <code>*italic*</code>,{" "}
                <code>[link text](https://…)</code>, <code>- </code> lists and{" "}
                <code>&gt; </code> quotes work; anything else is plain text, never
                HTML. &ldquo;The reader&rdquo; is whoever opens the page — their{" "}
                {lexicon.nounPlural} are the ones marked, and{" "}
                <code>{"{#runs}"}</code> is for them once one has a score.
              </>
            }
            groups={[
              {
                label: "about everyone, and the reader",
                chips: CONCLUSION_PLACEHOLDERS.map((p) => ({
                  label: `{${p.key}}`,
                  title: p.description,
                  open: `{${p.key}}`,
                })),
              },
              {
                label: "headings — on a line of their own",
                chips: [
                  { label: "# heading", title: "The page's title", open: "\n\n# " },
                  { label: "## subheading", title: "A section's heading", open: "\n\n## " },
                ],
              },
              FORMATTING,
              {
                label: "figures — each on a line of its own",
                chips: CONCLUSION_BLOCKS.map((key) => ({
                  label: `{${key}}`,
                  title: CONCLUSION_BLOCK_DESCRIPTIONS[key],
                  open: `\n\n{${key}}\n\n`,
                })),
              },
              CONDITIONAL_CHIPS(CONDITIONALS),
            ]}
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">before the first score — in place of the figures</span>
            <textarea
              name="empty"
              rows={2}
              maxLength={CONCLUSION_LIMITS.empty}
              value={draft.empty}
              placeholder={DEFAULT_CONCLUSION_PAGE.empty}
              onChange={(e) => {
                set({ empty: e.target.value });
                setScreen("conclusionEmpty");
              }}
              className="term-input resize-y rounded bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">before it&rsquo;s published — the whole page</span>
            <textarea
              name="pending"
              rows={2}
              maxLength={CONCLUSION_LIMITS.pending}
              value={draft.pending}
              placeholder={DEFAULT_CONCLUSION_PAGE.pending}
              onChange={(e) => {
                set({ pending: e.target.value });
                setScreen("conclusionPending");
              }}
              className="term-input resize-y rounded bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <p className="-mt-3 text-[11px] leading-relaxed text-dim">
            Plain text, with <code>{"{noun}"}</code>, <code>{"{nounPlural}"}</code>{" "}
            and <code>{"{project}"}</code>. Blank means the default.
          </p>
        </fieldset>
      </form>

      <section className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-paper/10">
          <div role="tablist" aria-label="Conclusion states" className="flex flex-wrap gap-x-5">
            {SCREENS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={screen === key}
                onClick={() => setScreen(key)}
                className={tab(screen === key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pb-2 text-[11px]">
            {(Object.keys(DEVICES) as Device[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key)}
                className={toggle(device === key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 text-[11px]">
          <span className="text-dim">read by</span>
          <button type="button" onClick={() => setPlayed(true)} className={toggle(played)}>
            someone who played
          </button>
          <button type="button" onClick={() => setPlayed(false)} className={toggle(!played)}>
            a visitor with no {lexicon.noun}
          </button>
        </div>

        <PreviewFrame
          slug={slug}
          theme={theme}
          lexicon={lexicon}
          copy={copy}
          conclusion={draft}
          played={played}
          screen={screen}
          device={device}
          onScreen={setScreen}
        />

        <p className="text-[11px] leading-relaxed text-dim">
          The participant page itself, with made-up runs. Blank fields show their
          defaults, as saving them would.
        </p>
      </section>
    </div>
  );
}
