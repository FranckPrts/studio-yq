"use client";

import { useActionState, useState } from "react";
import { saveAppearance, type AppearanceState } from "./actions";
import {
  FONTS,
  type FontKey,
  type ProjectLexicon,
} from "@/lib/theme/project-theme";
import { useUnsavedChanges } from "../use-unsaved-changes";

/**
 * The typeface and the word for what participants make. Posts only these, and
 * `saveAppearance` keeps whatever it was not sent, so the palette saved on the
 * colours page is left alone.
 */
export default function TypeForm({
  slug,
  font,
  lexicon,
}: {
  slug: string;
  font: FontKey;
  lexicon: ProjectLexicon;
}) {
  const [saved, setSaved] = useState({ font, ...lexicon });
  const [state, action, pending] = useActionState<AppearanceState, FormData>(
    async (prev, formData) => {
      const result = await saveAppearance(prev, formData);
      if (result.saved) {
        setSaved({
          font: String(formData.get("font")) as FontKey,
          noun: String(formData.get("noun")),
          nounPlural: String(formData.get("nounPlural")),
        });
      }
      return result;
    },
    {},
  );
  const [draftFont, setDraftFont] = useState(font);
  const [words, setWordsState] = useState(lexicon);

  const dirty =
    draftFont !== saved.font ||
    words.noun !== saved.noun ||
    words.nounPlural !== saved.nounPlural;
  useUnsavedChanges(dirty);

  function setWords(update: Partial<ProjectLexicon>) {
    setWordsState((prev) => ({ ...prev, ...update }));
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="slug" value={slug} />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">typeface</h2>
        <select
          name="font"
          value={draftFont}
          onChange={(e) => setDraftFont(e.target.value as FontKey)}
          className="term-input max-w-xs border-b border-paper/20 bg-void"
        >
          {Object.entries(FONTS).map(([key, f]) => (
            <option key={key} value={key}>
              {f.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] leading-relaxed text-dim">
          Typefaces come from a list we host, so licensing and loading stay our
          problem rather than yours.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">language</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">what participants make</span>
            <input
              name="noun"
              value={words.noun}
              onChange={(e) => setWords({ noun: e.target.value })}
              className="term-input border-b border-paper/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-dim">plural</span>
            <input
              name="nounPlural"
              value={words.nounPlural}
              onChange={(e) => setWords({ nounPlural: e.target.value })}
              className="term-input border-b border-paper/20"
            />
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-dim">
          This word replaces “avatar” everywhere a participant reads it. It
          belongs to the project rather than the script, so changing it never
          means editing delivered code.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="self-start text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          {pending ? "saving…" : "save typeface & language"}
        </button>
        {state.error ? (
          <p role="alert" className="text-xs text-red-400">
            {state.error}
          </p>
        ) : dirty ? (
          <p className="text-xs text-amber-400/80">unsaved changes</p>
        ) : (
          state.saved && <p className="text-xs text-dim">saved</p>
        )}
      </div>
    </form>
  );
}
