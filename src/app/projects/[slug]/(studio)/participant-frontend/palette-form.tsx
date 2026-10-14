"use client";

import { useActionState, useState } from "react";
import { saveAppearance, type AppearanceState } from "./actions";
import {
  contrastIssues,
  FONTS,
  MIN_TEXT_CONTRAST,
  type FontKey,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { useUnsavedChanges } from "../use-unsaved-changes";

export type Palette = Pick<ProjectTheme, "void" | "paper" | "dim">;

const ROLES = ["void", "paper", "dim"] as const;

/**
 * The three colours and the typeface. Posts only these, and `saveAppearance`
 * keeps whatever it was not sent, so the noun saved on the text page is left
 * alone.
 */
export default function PaletteForm({
  slug,
  palette,
  font,
}: {
  slug: string;
  palette: Palette;
  font: FontKey;
}) {
  const [saved, setSaved] = useState({ ...palette, font });
  const [state, action, pending] = useActionState<AppearanceState, FormData>(
    async (prev, formData) => {
      const result = await saveAppearance(prev, formData);
      if (result.saved) {
        setSaved({
          void: String(formData.get("void")),
          paper: String(formData.get("paper")),
          dim: String(formData.get("dim")),
          font: String(formData.get("font")) as FontKey,
        });
      }
      return result;
    },
    {},
  );
  const [draft, setDraft] = useState(palette);
  const [draftFont, setDraftFont] = useState(font);

  const dirty =
    ROLES.some((role) => draft[role] !== saved[role]) || draftFont !== saved.font;
  const lowContrast = contrastIssues(draft);
  useUnsavedChanges(dirty);

  function set(role: (typeof ROLES)[number], value: string) {
    setDraft((prev) => ({ ...prev, [role]: value.toLowerCase() }));
  }

  const swatch = (key: (typeof ROLES)[number], label: string, hint: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-dim">
        {label} <span className="text-paper/25">· {hint}</span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          name={key}
          value={draft[key]}
          onChange={(e) => set(key, e.target.value)}
          className="h-7 w-10 cursor-pointer border border-paper/20 bg-transparent"
        />
        <code className="text-[11px] text-dim">{draft[key]}</code>
      </div>
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="slug" value={slug} />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">palette</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {swatch("void", "background", "the void behind everything")}
          {swatch("paper", "text", "names, values, prompts")}
          {swatch("dim", "secondary", "labels and help")}
        </div>
        {lowContrast.length > 0 && (
          <ul role="status" className="text-[11px] leading-relaxed text-warning/90">
            {lowContrast.map(({ role, ratio }) => (
              <li key={role}>
                {role === "paper" ? "text" : "secondary"} on background is{" "}
                {ratio.toFixed(1)}:1 — hard to read below {MIN_TEXT_CONTRAST}:1.
                It still saves.
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] leading-relaxed text-dim">
          Three colours, because that is all the participant page is drawn in.
          Warnings and errors keep their own amber and red, so they stay
          readable whatever the palette.
        </p>
      </section>

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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="self-start text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          {pending ? "saving…" : "save colours & font"}
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
    </form>
  );
}
