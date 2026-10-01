"use client";

import { useActionState, useState } from "react";
import { saveAppearance, type AppearanceState } from "./actions";
import type { ProjectTheme } from "@/lib/theme/project-theme";
import { useUnsavedChanges } from "../use-unsaved-changes";

export type Palette = Pick<ProjectTheme, "void" | "paper" | "dim">;

const ROLES = ["void", "paper", "dim"] as const;

/**
 * The three colours. Posts only these, and `saveAppearance` keeps whatever it
 * was not sent, so the typeface saved on the text page is left alone.
 */
export default function PaletteForm({
  slug,
  palette,
  onDraft,
}: {
  slug: string;
  palette: Palette;
  /** Every unsaved change, for the live preview next to the form. */
  onDraft?: (palette: Palette) => void;
}) {
  const [saved, setSaved] = useState(palette);
  const [state, action, pending] = useActionState<AppearanceState, FormData>(
    async (prev, formData) => {
      const result = await saveAppearance(prev, formData);
      if (result.saved) {
        setSaved({
          void: String(formData.get("void")),
          paper: String(formData.get("paper")),
          dim: String(formData.get("dim")),
        });
      }
      return result;
    },
    {},
  );
  const [draft, setDraftState] = useState(palette);

  const dirty = ROLES.some((role) => draft[role] !== saved[role]);
  useUnsavedChanges(dirty);

  function set(role: (typeof ROLES)[number], value: string) {
    const next = { ...draft, [role]: value.toLowerCase() };
    setDraftState(next);
    onDraft?.(next);
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
        <p className="text-[11px] leading-relaxed text-dim">
          Three colours, because that is all the participant page is drawn in.
          Warnings and errors keep their own amber and red, so they stay
          readable whatever the palette.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="self-start text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          {pending ? "saving…" : "save colours"}
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
