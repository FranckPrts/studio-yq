import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { projectReadiness } from "@/lib/projects/readiness";
import { Skeleton, SkeletonLine, SkeletonTitle } from "@/design";
import Sidebar from "./sidebar";

/**
 * Everything used to *set up* a project shares this frame: a vertical menu on
 * the left, grouped by what the pages are about, and the page beside it.
 *
 * What is used to *run* a project — the live console and the leaderboard —
 * sits outside this group on purpose. Both open in their own tab from the
 * menu, for a second screen or a projector, where a menu is in the way.
 *
 * Only the access check holds the frame back. The menu's own data (name,
 * readiness) streams in behind a skeleton, so opening a project shows the
 * frame and the page's `loading.tsx` at once instead of waiting on both.
 */
export default async function StudioLayout({
  children,
  params,
}: LayoutProps<"/projects/[slug]">) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  return (
    <div className="flex min-h-screen flex-col bg-void text-paper md:flex-row">
      <aside className="shrink-0 border-b border-paper/10 p-6 md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:border-r md:border-b-0">
        <Suspense fallback={<SidebarSkeleton />}>
          <ProjectSidebar slug={slug} projectId={access.projectId} />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

async function ProjectSidebar({
  slug,
  projectId,
}: {
  slug: string;
  projectId: string;
}) {
  const [project, readiness] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        name: true,
        openForParticipation: true,
        conclusionPublishedAt: true,
      },
    }),
    projectReadiness(projectId),
  ]);

  return (
    <Sidebar
      slug={slug}
      projectName={project.name}
      open={project.openForParticipation}
      conclusionPublished={project.conclusionPublishedAt !== null}
      scriptReady={readiness.hasScript}
      databaseReady={readiness.hasConnection && readiness.provisioned}
    />
  );
}

/** The menu's shape: the way back, the project name, then a few groups. */
function SidebarSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonLine className="w-16" />
        <SkeletonTitle className="w-32" />
      </div>
      {[3, 2, 4].map((items, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-14" />
          {Array.from({ length: items }, (_, i) => (
            <SkeletonLine key={i} className={i % 2 ? "w-20" : "w-28"} />
          ))}
        </div>
      ))}
    </div>
  );
}
