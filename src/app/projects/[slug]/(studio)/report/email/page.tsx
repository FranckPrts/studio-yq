import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import type { Parameter } from "@/lib/params/types";
import { coerceReportEmail } from "@/lib/report/email-template";
import { reportScript } from "@/lib/report/mini-script";
import { coerceLexicon, coerceTheme, FONTS } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import EmailEditor from "./email-editor";

export const dynamic = "force-dynamic";

/**
 * The words of the participant report, and a preview of the email exactly as
 * one participant would get it — their mini-avatar, the map with theirs
 * circled, and where their best score fell.
 */
export default async function EmailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const [project, script] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: {
        name: true,
        theme: true,
        lexicon: true,
        reportEmail: true,
        connection: {
          select: { projectUrl: true, publishableKey: true, provisionedAt: true },
        },
        scripts: {
          orderBy: { version: "desc" },
          take: 1,
          select: { parameters: true },
        },
      },
    }),
    reportScript(access.projectId),
  ]);

  const canEdit = access.role === "OWNER" || access.role === "COLLABORATOR";
  const lexicon = coerceLexicon(project.lexicon);
  const theme = coerceTheme(project.theme);
  const parameters = (project.scripts[0]?.parameters ?? []) as unknown as Parameter[];
  const connection = project.connection;
  const database =
    connection?.projectUrl && connection.publishableKey && connection.provisionedAt
      ? { projectUrl: connection.projectUrl, publishableKey: connection.publishableKey }
      : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <PageHeader
        title="email"
        subtitle="What each participant receives — one email per person, covering all their avatars."
      />

      {!script && (
        <p className="text-xs text-dim">
          The pictures need a script to draw with —{" "}
          <Link
            href={`/projects/${slug}/visual`}
            className="underline underline-offset-4 hover:text-paper"
          >
            upload the main script
          </Link>{" "}
          first. The wording can be written now.
        </p>
      )}

      <EmailEditor
        slug={slug}
        canEdit={canEdit}
        initial={coerceReportEmail(project.reportEmail)}
        projectName={project.name}
        theme={{ ...theme, fontStack: FONTS[theme.font].stack }}
        noun={lexicon.noun}
        nounPlural={lexicon.nounPlural}
        answerKeys={parameters.filter((p) => p.type === "text").map((p) => p.name)}
        parameters={parameters}
        script={
          script
            ? {
                code: script.code,
                extensions: script.extensions,
                source: script.source,
                key: `${script.source}:${script.version}`,
              }
            : null
        }
        database={database}
      />
    </main>
  );
}
