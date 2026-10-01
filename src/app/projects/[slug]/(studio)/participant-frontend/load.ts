import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceLexicon, coerceTheme } from "@/lib/theme/project-theme";
import { coerceCopy } from "@/lib/theme/project-copy";

/** What every style & language page starts from: the saved look and words. */
export async function loadFrontend(slug: string) {
  const access = await requireProjectRole(slug, "VIEWER");

  const project = await db.project.findUniqueOrThrow({
    where: { id: access.projectId },
    select: {
      theme: true,
      lexicon: true,
      copy: true,
      scripts: {
        orderBy: { version: "desc" },
        take: 1,
        select: { parameters: true },
      },
    },
  });

  const parameters = (project.scripts[0]?.parameters ?? []) as { type?: string }[];

  return {
    theme: coerceTheme(project.theme),
    lexicon: coerceLexicon(project.lexicon),
    copy: coerceCopy(project.copy),
    /** Whether the participant gets a questions screen at all. */
    hasQuestions: parameters.some((p) => p.type === "text"),
    canEdit: access.role === "OWNER" || access.role === "COLLABORATOR",
  };
}
