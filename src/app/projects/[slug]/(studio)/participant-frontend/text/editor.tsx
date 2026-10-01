"use client";

import { useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import TypeForm from "../type-form";
import CopyForm from "../copy-form";
import PreviewPane from "../preview-pane";

/**
 * The typeface, the noun and every sentence, with one preview fed by both
 * forms' drafts — so a renamed noun shows inside the wording around it.
 */
export default function TextEditor({
  slug,
  theme,
  lexicon: savedLexicon,
  copy: savedCopy,
  canEdit,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  canEdit: boolean;
}) {
  const [font, setFont] = useState(theme.font);
  const [lexicon, setLexicon] = useState(savedLexicon);
  const [copy, setCopy] = useState(savedCopy);

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
      <div className="flex flex-col gap-8">
        {canEdit ? (
          <>
            <TypeForm
              slug={slug}
              font={theme.font}
              lexicon={savedLexicon}
              onDraft={(f, l) => {
                setFont(f);
                setLexicon(l);
              }}
            />
            <section className="flex flex-col gap-4 border-t border-paper/10 pt-8">
              <h2 className="text-sm">wording</h2>
              <CopyForm slug={slug} copy={savedCopy} onDraft={setCopy} />
            </section>
          </>
        ) : (
          <p className="text-xs text-dim">
            You have read-only access to this project.
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-8">
        <PreviewPane
          slug={slug}
          theme={{ ...theme, font }}
          lexicon={lexicon}
          copy={copy}
        />
      </div>
    </div>
  );
}
