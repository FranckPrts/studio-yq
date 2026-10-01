"use client";

import { useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import PaletteForm from "../palette-form";
import PreviewPane from "../preview-pane";

/** The palette and a preview of it, sharing the draft so colours show before they are saved. */
export default function ColoursEditor({
  slug,
  theme,
  lexicon,
  copy,
  canEdit,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState(theme);

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
      <div className="flex flex-col gap-8">
        {canEdit ? (
          <PaletteForm
            slug={slug}
            palette={{ void: theme.void, paper: theme.paper, dim: theme.dim }}
            onDraft={(palette) => setDraft((prev) => ({ ...prev, ...palette }))}
          />
        ) : (
          <p className="text-xs text-dim">
            You have read-only access to this project.
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-8">
        <PreviewPane
          slug={slug}
          theme={draft}
          lexicon={lexicon}
          copy={copy}
          initialScreen="tune"
        />
      </div>
    </div>
  );
}
