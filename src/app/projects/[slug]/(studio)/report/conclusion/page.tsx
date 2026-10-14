import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceConclusionPage } from "@/lib/report/conclusion-template";
import { coerceCopy } from "@/lib/theme/project-copy";
import { coerceLexicon, coerceTheme } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import ConclusionEditor from "./conclusion-editor";

export const dynamic = "force-dynamic";

/**
 * The conclusion page's words and layout, with the page itself beside them —
 * made-up runs, redrawn from the unsaved draft as it is typed.
 */
export default async function ConclusionEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const project = await db.project.findUniqueOrThrow({
    where: { id: access.projectId },
    select: {
      theme: true,
      lexicon: true,
      copy: true,
      conclusionPage: true,
      conclusionPublishedAt: true,
    },
  });

  const published = project.conclusionPublishedAt;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <PageHeader
        title="conclusion"
        subtitle={`How every run went, for anyone with the link — ${
          published
            ? `published since ${published.toISOString().slice(0, 10)}`
            : "not published yet; publish it from settings once the event is over"
        }.`}
      />

      <ConclusionEditor
        slug={slug}
        canEdit={access.role === "OWNER" || access.role === "COLLABORATOR"}
        initial={coerceConclusionPage(project.conclusionPage)}
        theme={coerceTheme(project.theme)}
        lexicon={coerceLexicon(project.lexicon)}
        copy={coerceCopy(project.copy)}
      />
    </main>
  );
}
