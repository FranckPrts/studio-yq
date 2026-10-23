"use client";

import { useActionState, useState } from "react";
import { createProjectAction, type NewProjectState } from "./actions";
import { slugify } from "@/lib/slug";
import { buttonClass } from "@/design";

/**
 * Name and address. The address follows the name until it is edited by hand,
 * then stays as typed — and is shown in full, because once the project exists
 * it never changes: it is the link participants are given.
 */
export default function NewProjectForm({ base }: { base: string }) {
  const [state, action, pending] = useActionState<NewProjectState, FormData>(
    createProjectAction,
    {},
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const shown = slugEdited ? slug : name.trim() ? slugify(name) : "";

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">name</span>
        <input
          name="name"
          required
          maxLength={120}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nowadays · CCN 2026"
          className="term-input rounded bg-surface px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">participant address</span>
        <div className="flex items-center rounded bg-surface px-2 py-1.5 text-sm">
          <span className="shrink-0 text-dim">{base}/p/</span>
          <input
            name="slug"
            required
            maxLength={60}
            value={shown}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
            spellCheck={false}
            autoCapitalize="off"
            className="term-input min-w-0 flex-1 bg-transparent"
          />
        </div>
      </label>
      <p className="text-[11px] leading-relaxed text-dim">
        This is the link participants are given, and it can&rsquo;t be changed
        once the project exists — renaming the project later leaves it alone.
        Lowercase letters, numbers and hyphens.
      </p>

      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
          {state.suggestion && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  setSlugEdited(true);
                  setSlug(state.suggestion!);
                }}
                className="underline underline-offset-4 hover:text-paper"
              >
                use {state.suggestion}
              </button>
            </>
          )}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-dim">
        The project starts empty and closed. Its overview lists what it needs
        before participants can join — a database, a script — and each part can
        start from the starter visual.
      </p>

      <div>
        <button
          type="submit"
          disabled={pending || !shown}
          className={buttonClass("boxed", undefined, undefined, "strong")}
        >
          {pending ? "creating…" : "create project"}
        </button>
      </div>
    </form>
  );
}
