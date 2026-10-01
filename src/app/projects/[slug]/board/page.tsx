import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceLexicon, coerceTheme } from "@/lib/theme/project-theme";
import { coerceCopy } from "@/lib/theme/project-copy";
import Shut from "@/app/e/[slug]/shut";
import Board from "./board";

export const dynamic = "force-dynamic";

/**
 * The leaderboard, for a screen in the room: every avatar's best run, ranked,
 * in the project's own palette, typeface and words — it is the participant
 * page's companion, not part of the console. No console chrome, so it can go
 * full-screen on a projector as it is.
 *
 * Behind project access like the rest of `/projects`: whoever puts it on the
 * screen is signed in. Scores are read from the tenant's Supabase in the
 * browser, as the ops console does; none pass through us.
 */
export default async function BoardPage({
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
      theme: true,
      lexicon: true,
      copy: true,
      connection: {
        select: { projectUrl: true, publishableKey: true, provisionedAt: true },
      },
    },
  });

  const theme = coerceTheme(project.theme);
  const connection = project.connection;

  if (
    !connection?.projectUrl ||
    !connection.publishableKey ||
    !connection.provisionedAt
  ) {
    return (
      <Shut
        theme={theme}
        title={project.name}
        message="The leaderboard reads the project's database, which isn't connected and provisioned yet."
      />
    );
  }

  return (
    <Board
      slug={slug}
      projectName={project.name}
      theme={theme}
      lexicon={coerceLexicon(project.lexicon)}
      copy={coerceCopy(project.copy)}
      projectUrl={connection.projectUrl}
      publishableKey={connection.publishableKey}
    />
  );
}
