import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceLexicon } from "@/lib/theme/project-theme";
import type { Parameter } from "@/lib/params/types";
import OpsConsole from "./console";

export const dynamic = "force-dynamic";

/**
 * The room, while an event is running: who has made an avatar, which two are
 * on stage, and the scores coming back from the scene.
 *
 * Viewers may watch. Staging, and correcting or deleting a session, need a
 * collaborator or owner.
 */
export default async function ConsolePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const project = await db.project.findUniqueOrThrow({
    where: { id: access.projectId },
    select: {
      name: true,
      openForParticipation: true,
      lexicon: true,
      connection: {
        select: { projectUrl: true, publishableKey: true, provisionedAt: true },
      },
      scripts: {
        orderBy: { version: "desc" },
        take: 1,
        select: { code: true, parameters: true, version: true },
      },
    },
  });

  const connection = project.connection;
  const script = project.scripts[0];
  const ready =
    !!connection?.projectUrl &&
    !!connection.publishableKey &&
    !!connection.provisionedAt;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 bg-void p-8 text-paper">
      {/* Opened in its own tab from the overview, so no project menu — just
          the way back to it. */}
      <header className="flex items-baseline justify-between gap-4 border-b border-paper/10 pb-3">
        <div className="min-w-0">
          <h1 className="text-sm">{project.name} · live console</h1>
          <p className="text-xs text-dim">
            {project.openForParticipation
              ? "Open to participants."
              : "Closed — nothing new will arrive until it is opened."}
          </p>
        </div>
        <Link
          href={`/projects/${slug}`}
          className="shrink-0 text-xs text-dim underline-offset-4 hover:text-paper hover:underline"
        >
          ‹ project
        </Link>
      </header>

      {ready ? (
        <OpsConsole
          slug={slug}
          projectUrl={connection!.projectUrl!}
          publishableKey={connection!.publishableKey!}
          parameters={(script?.parameters ?? []) as unknown as Parameter[]}
          code={script?.code ?? null}
          scriptVersion={script?.version ?? null}
          lexicon={coerceLexicon(project.lexicon)}
          canOperate={access.role === "OWNER" || access.role === "COLLABORATOR"}
        />
      ) : (
        <p className="text-xs text-dim">
          The console reads the project&rsquo;s own database, which isn&rsquo;t
          set up yet.{" "}
          <Link
            href={`/projects/${slug}/database`}
            className="underline underline-offset-4 hover:text-paper"
          >
            Connect and provision it
          </Link>{" "}
          first.
        </p>
      )}
    </main>
  );
}
