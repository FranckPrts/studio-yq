import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import type { Parameter } from "@/lib/params/types";
import { MINI_CONTRACT } from "@/lib/report/mini";
import { reportScript } from "@/lib/report/mini-script";
import { coerceLexicon, coerceTheme } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import MiniUploadSection from "./upload-section";
import MiniPreview from "./mini-preview";

export const dynamic = "force-dynamic";

/**
 * The first part of the participant report: the simplified avatar drawn on the
 * map and in the email. The tenant's one input to how a report looks — layout,
 * colours, type and links all come from the project already.
 */
export default async function MiniAvatarPage({
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
        theme: true,
        lexicon: true,
        connection: {
          select: { projectUrl: true, publishableKey: true, provisionedAt: true },
        },
        scripts: {
          orderBy: { version: "desc" },
          take: 1,
          select: { parameters: true },
        },
        miniScripts: {
          orderBy: { version: "desc" },
          take: 20,
          select: { version: true, label: true, code: true, createdAt: true },
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-8">
      <PageHeader
        title="mini-avatar"
        subtitle={`The simplified ${lexicon.noun} a participant report draws — on the map, and in the email.`}
      />

      <section className="flex max-w-3xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-dim uppercase">script</h2>
          <p className="max-w-prose text-[11px] leading-relaxed text-dim">
            Optional. Without one, reports draw the main script as it is — which
            can crowd a map, so a simpler version helps: one fish instead of a
            whole school, say. It uses the same parameters as the main script, so
            participants set nothing twice. The map&rsquo;s layout, colours, type
            and links come from the project.
          </p>
        </header>

        <details className="group rounded border border-paper/10 p-4 text-xs">
          <summary className="cursor-pointer text-paper/90">
            what a mini-script must respect
          </summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
            {MINI_CONTRACT.map(({ rule, detail }) => (
              <li key={rule}>
                <span className="text-paper/90">{rule}</span>{" "}
                <span className="text-dim">{detail}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-dim">
            Without a mini-script the main script is drawn with{" "}
            <code>intensity: 1</code>, plus <code>seed</code> and{" "}
            <code>mini: true</code> — a main script may check <code>data.mini</code>{" "}
            to simplify itself instead of keeping a second file.
          </p>
        </details>

        <MiniUploadSection
          slug={slug}
          canEdit={canEdit}
          hasMainScript={project.scripts.length > 0}
          versions={project.miniScripts.map((m) => ({
            version: m.version,
            label: m.label,
            hasCode: m.code !== null,
            createdAt: m.createdAt.toISOString().slice(0, 10),
          }))}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-paper/10 pt-8">
        <header className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-dim uppercase">preview</h2>
          <p className="max-w-prose text-[11px] leading-relaxed text-dim">
            Real {lexicon.nounPlural}, rendered the way a report will: each one
            run to frame and photographed, on the project&rsquo;s background.
          </p>
        </header>

        {script ? (
          <MiniPreview
            code={script.code}
            extensions={script.extensions}
            source={script.source}
            scriptKey={`${script.source}:${script.version}`}
            parameters={parameters}
            ground={theme.void}
            noun={lexicon.noun}
            database={database}
          />
        ) : (
          <p className="text-xs text-dim">
            Nothing to draw yet —{" "}
            <Link
              href={`/projects/${slug}/visual`}
              className="underline underline-offset-4 hover:text-paper"
            >
              upload the main script
            </Link>{" "}
            first.
          </p>
        )}
      </section>
    </main>
  );
}
