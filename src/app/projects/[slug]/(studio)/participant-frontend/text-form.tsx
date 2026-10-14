"use client";

import { useActionState, useState } from "react";
import { saveText, type AppearanceState } from "./actions";
import type { ProjectLexicon } from "@/lib/theme/project-theme";
import {
  COPY_FIELDS,
  type CopyKey,
  type ProjectCopy,
} from "@/lib/theme/project-copy";
import { useUnsavedChanges } from "../use-unsaved-changes";

const GROUPS = Array.from(
  new Set(Object.values(COPY_FIELDS).map((f) => f.group)),
);

const TABS = ["language", ...GROUPS] as const;
type Tab = (typeof TABS)[number];

const FIELDS = Object.entries(COPY_FIELDS) as [
  CopyKey,
  (typeof COPY_FIELDS)[CopyKey],
][];

type Text = ProjectLexicon & ProjectCopy;

/** What a save sent, as the form holds it — the baseline unsaved edits are measured from. */
function submitted(formData: FormData): Text {
  const text = {
    noun: String(formData.get("noun") ?? ""),
    nounPlural: String(formData.get("nounPlural") ?? ""),
    introEnabled: formData.get("introEnabled") === "on",
  } as Text;
  for (const [key] of FIELDS) text[key] = String(formData.get(key) ?? "");
  return text;
}

/** Which tab a changed field sits on, so the tab can say so. */
function tabOf(key: keyof Text): Tab {
  if (key === "noun" || key === "nounPlural") return "language";
  if (key === "introEnabled") return "welcome";
  return COPY_FIELDS[key].group;
}

/**
 * The word for what participants make, and every sentence they read, one tab
 * per screen. Every tab stays mounted — only hidden — so a save posts every
 * field, not just the ones on the tab in front: `saveCopy` reads a missing
 * field as blank, and blank means "back to the default".
 */
export default function TextForm({
  slug,
  lexicon,
  copy,
}: {
  slug: string;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
}) {
  const [saved, setSaved] = useState<Text>({ ...lexicon, ...copy });
  const [draft, setDraft] = useState<Text>({ ...lexicon, ...copy });
  const [tab, setTab] = useState<Tab>("language");
  const [state, action, pending] = useActionState<AppearanceState, FormData>(
    async (prev, formData) => {
      const result = await saveText(prev, formData);
      if (result.saved) setSaved(submitted(formData));
      return result;
    },
    {},
  );

  const changed = new Set(
    (Object.keys(draft) as (keyof Text)[])
      .filter((key) => draft[key] !== saved[key])
      .map(tabOf),
  );
  const dirty = changed.size > 0;
  useUnsavedChanges(dirty);

  function set(update: Partial<Text>) {
    setDraft((d) => ({ ...d, ...update }));
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          {pending ? "saving…" : "save text"}
        </button>
        {state.error ? (
          <p role="alert" className="text-xs text-danger">
            {state.error}
          </p>
        ) : dirty ? (
          <p className="text-xs text-warning/80">unsaved changes</p>
        ) : (
          state.saved && <p className="text-xs text-dim">saved</p>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Participant text"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-paper/10"
      >
        {TABS.map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`text-tab-${key}`}
              aria-selected={active}
              aria-controls={`text-panel-${key}`}
              onClick={() => setTab(key)}
              className={`-mb-px border-b pb-2 text-xs ${
                active
                  ? "border-paper text-paper"
                  : "border-transparent text-dim hover:text-paper"
              }`}
            >
              {key}
              {changed.has(key) && (
                <span className="text-warning/80" aria-label="unsaved changes">
                  {" "}•
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id="text-panel-language"
        aria-labelledby="text-tab-language"
        hidden={tab !== "language"}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">what participants make</span>
            <input
              name="noun"
              value={draft.noun}
              onChange={(e) => set({ noun: e.target.value })}
              className="term-input border-b border-paper/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">plural</span>
            <input
              name="nounPlural"
              value={draft.nounPlural}
              onChange={(e) => set({ nounPlural: e.target.value })}
              className="term-input border-b border-paper/20"
            />
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-dim">
          This word replaces “avatar” everywhere a participant reads it. It
          belongs to the project rather than the script, so changing it never
          means editing delivered code.
        </p>
        <p className="text-[11px] leading-relaxed text-dim">
          The other tabs are the wording, screen by screen. Plain text — line
          breaks are kept, and nothing is interpreted as HTML. Use{" "}
          <code className="text-paper/70">{"{noun}"}</code>,{" "}
          <code className="text-paper/70">{"{nounPlural}"}</code> and{" "}
          <code className="text-paper/70">{"{name}"}</code> (what the participant
          called theirs, which may be empty). Leave a field blank to use the
          default. Error messages, like a full network at an event, stay ours:
          they have to say what to do when something breaks.
        </p>
      </section>

      {GROUPS.map((group) => {
        const muted = group === "welcome" && !draft.introEnabled;
        return (
          <section
            key={group}
            role="tabpanel"
            id={`text-panel-${group}`}
            aria-labelledby={`text-tab-${group}`}
            hidden={tab !== group}
            className="flex flex-col gap-4"
          >
            {group === "welcome" && (
              <label className="flex items-center gap-2 text-[11px] text-dim">
                <input
                  type="checkbox"
                  name="introEnabled"
                  checked={draft.introEnabled}
                  onChange={(e) => set({ introEnabled: e.target.checked })}
                />
                show a welcome screen to new participants
              </label>
            )}

            {FIELDS.filter(([, f]) => f.group === group).map(([key, field]) => (
              <label
                key={key}
                className={`flex flex-col gap-1 ${muted ? "opacity-40" : ""}`}
              >
                <span className="text-[11px] text-dim">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    name={key}
                    rows={2}
                    maxLength={400}
                    value={draft[key]}
                    placeholder={field.default}
                    onChange={(e) => set({ [key]: e.target.value })}
                    className="term-input resize-y border-b border-paper/20 text-sm"
                  />
                ) : (
                  <input
                    name={key}
                    maxLength={400}
                    value={draft[key]}
                    placeholder={field.default}
                    onChange={(e) => set({ [key]: e.target.value })}
                    className="term-input border-b border-paper/20 text-sm"
                  />
                )}
              </label>
            ))}
          </section>
        );
      })}
    </form>
  );
}
