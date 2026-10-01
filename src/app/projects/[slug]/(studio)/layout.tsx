import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { projectReadiness } from "@/lib/projects/readiness";
import Sidebar from "./sidebar";

/**
 * Everything used to *set up* a project shares this frame: a vertical menu on
 * the left, grouped by what the pages are about, and the page beside it.
 *
 * What is used to *run* a project — the live console and the leaderboard —
 * sits outside this group on purpose. Both open in their own tab from the
 * overview, for a second screen or a projector, where a menu is in the way.
 */
export default async function StudioLayout({
  children,
  params,
}: LayoutProps<"/projects/[slug]">) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const [project, readiness] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: { name: true },
    }),
    projectReadiness(access.projectId),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-void text-paper md:flex-row">
      <aside className="shrink-0 border-b border-paper/10 p-6 md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:border-r md:border-b-0">
        <Sidebar
          slug={slug}
          projectName={project.name}
          scriptReady={readiness.hasScript}
          databaseReady={readiness.hasConnection && readiness.provisioned}
        />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
