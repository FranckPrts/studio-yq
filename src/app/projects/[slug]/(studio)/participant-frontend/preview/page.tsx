import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import PreviewPane from "../preview-pane";
import StarterButton from "../../visual/starter-button";
import { adoptStarterScript } from "../../visual/actions";

export const dynamic = "force-dynamic";

export default async function LivePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, lexicon, copy } = await loadFrontend(slug);
  const access = await requireProjectRole(slug, "VIEWER");
  const canEdit = access.role === "OWNER" || access.role === "COLLABORATOR";
  const latest = await db.avatarScript.findFirst({
    where: { projectId: access.projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const hasScript = !!latest;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="style & language · live preview"
        subtitle="The participant page as currently saved, one screen at a time."
      />
      {!hasScript && canEdit && (
        <div className="flex flex-wrap items-center gap-3 rounded bg-surface p-3">
          <StarterButton slug={slug} action={adoptStarterScript} />
          <p className="min-w-48 flex-1 text-[11px] leading-relaxed text-dim">
            No script yet, so there is no {lexicon.noun} to show. The starter
            visual gives this preview something to draw while yours is in the
            making.
          </p>
        </div>
      )}
      {/* Keyed on the script, so adding one here reloads the frame with it. */}
      <PreviewPane
        key={latest?.version ?? 0}
        slug={slug}
        theme={theme}
        lexicon={lexicon}
        copy={copy}
      />
    </main>
  );
}
