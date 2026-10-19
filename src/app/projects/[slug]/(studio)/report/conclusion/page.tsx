import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceConclusionPage } from "@/lib/report/conclusion-template";
import { coerceCopy } from "@/lib/theme/project-copy";
import { coerceLexicon, coerceTheme } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import ConclusionToggle from "../../conclusion-toggle";
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
      openForParticipation: true,
      conclusionPublishedAt: true,
    },
  });

  const canEdit = access.role === "OWNER" || access.role === "COLLABORATOR";
  const base = process.env.APP_BASE_URL ?? "http://localhost:3100";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <PageHeader
        title="conclusion"
        subtitle="How every run went, for anyone with the link — publish it once the event is over."
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">status</h2>
        <ConclusionToggle
          slug={slug}
          publishedAt={project.conclusionPublishedAt?.toISOString() ?? null}
          open={project.openForParticipation}
          canEdit={canEdit}
          conclusionUrl={`${base}/p/${slug}/conclusion`}
        />
      </section>

      <ConclusionEditor
        slug={slug}
        canEdit={canEdit}
        initial={coerceConclusionPage(project.conclusionPage)}
        theme={coerceTheme(project.theme)}
        lexicon={coerceLexicon(project.lexicon)}
        copy={coerceCopy(project.copy)}
      />
    </main>
  );
}
