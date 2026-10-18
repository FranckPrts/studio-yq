"use client";

import { useRef } from "react";

/** One insertable token: the text before the selection, after it, and where the caret lands. */
export type Chip = {
  label: string;
  title: string;
  open: string;
  close?: string;
  /** Leaves the caret this many characters before the end, e.g. inside "(https://)". */
  back?: number;
};

export type ChipGroup = { label: string; chips: Chip[] };

export const FORMATTING: ChipGroup = {
  label: "formatting — wraps the selection",
  chips: [
    {
      label: "[link](https://…)",
      title: "Turns the selected words into a link; replace https:// with the address",
      open: "[",
      close: "](https://)",
      back: 1,
    },
    { label: "**bold**", title: "Bold", open: "**", close: "**" },
    { label: "*italic*", title: "Italic", open: "*", close: "*" },
  ],
};

export const CONDITIONAL_CHIPS = (
  conditionals: { open: string; close: string; description: string }[],
): ChipGroup => ({
  label: "only for some — wraps the selection",
  chips: conditionals.map((c) => ({
    label: `${c.open}…${c.close}`,
    title: c.description,
    open: `${c.open}\n`,
    close: `\n${c.close}`,
  })),
});

/**
 * A light-markdown body — the report email's, the conclusion's — with the
 * tokens it understands one click away, each put in at the cursor or around
 * the selection.
 */
export default function TemplateField({
  name,
  label,
  value,
  defaultValue,
  onChange,
  canEdit,
  rows,
  maxLength,
  groups,
  syntax,
}: {
  name: string;
  label: string;
  value: string;
  /** Offered back with "restore the default text" once the body differs. */
  defaultValue: string;
  onChange: (value: string) => void;
  canEdit: boolean;
  rows: number;
  maxLength: number;
  groups: ChipGroup[];
  /** What the syntax allows, above the chips. */
  syntax: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert({ open, close = "", back = 0 }: Chip) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    onChange(value.slice(0, a) + open + value.slice(a, b) + close + value.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      const caret = a + open.length + (b - a) + close.length - back;
      el.setSelectionRange(caret, caret);
    });
  }

  const chip =
    "rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-paper/80 hover:bg-surface-hover hover:text-paper disabled:opacity-40";

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="flex items-baseline justify-between text-xs text-dim">
          {label}
          {canEdit && value !== defaultValue && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="underline-offset-4 hover:text-paper hover:underline"
            >
              restore the default text
            </button>
          )}
        </span>
        <textarea
          ref={ref}
          name={name}
          rows={rows}
          maxLength={maxLength}
          value={value}
          disabled={!canEdit}
          onChange={(e) => onChange(e.target.value)}
          className="term-input resize-y rounded bg-surface p-3 font-mono text-[13px] leading-relaxed"
        />
      </label>

      <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-dim">
        <p>{syntax}</p>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="text-paper/70">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.title}
                  disabled={!canEdit}
                  onClick={() => insert(c)}
                  className={chip}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
