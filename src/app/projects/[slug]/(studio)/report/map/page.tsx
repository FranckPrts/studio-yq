import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import type { Parameter } from "@/lib/params/types";
import { reportScript } from "@/lib/report/mini-script";
import { coerceLexicon, coerceTheme, FONTS } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import MapView from "./map-view";
import StarterButton from "../../visual/starter-button";
import { adoptStarterScript } from "../../visual/actions";

export const dynamic = "force-dynamic";

/**
 * The map every participant's report shows: the whole room, one mini-avatar per
 * node, in the project's own palette and type — and a search to see it the way
 * any one participant will, with their avatars ringed.
 */
export default async function MapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");
  const canEdit = access.role === "OWNER" || access.role === "COLLABORATOR";

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
      },
    }),
    reportScript(access.projectId),
  ]);

  const lexicon = coerceLexicon(project.lexicon);
  const theme = coerceTheme(project.theme);
  const parameters = (project.scripts[0]?.parameters ?? []) as unknown as Parameter[];
  const connection = project.connection;
  const database =
    connection?.projectUrl && connection.publishableKey && connection.provisionedAt
      ? { projectUrl: connection.projectUrl, publishableKey: connection.publishableKey }
      : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      <PageHeader
        title="map"
        subtitle="The room as every report shows it. Find someone to see it as they will."
      />

      <p className="max-w-prose text-[11px] leading-relaxed text-dim">
        One {lexicon.noun} per node, drawn by its{" "}
        <Link
          href={`/projects/${slug}/report/mini-avatar`}
          className="underline underline-offset-4 hover:text-paper"
        >
          mini-avatar
        </Link>
        . A pair&rsquo;s first run together sets how far apart they sit — closer
        is better — and a link&rsquo;s brightness is the pair&rsquo;s best score.
        Colours and type are the project&rsquo;s own. Any {lexicon.nounPlural}{" "}
        that never played are on the map too, smaller and dimmer, so nobody is
        missing from their own report.
      </p>

      {!script ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-xs text-dim">
            Nothing to draw yet —{" "}
            <Link
              href={`/projects/${slug}/visual`}
              className="underline underline-offset-4 hover:text-paper"
            >
              upload the main script
            </Link>{" "}
            first{canEdit ? ", or start from the starter visual." : "."}
          </p>
          {canEdit && <StarterButton slug={slug} action={adoptStarterScript} />}
        </div>
      ) : !database ? (
        <p className="text-xs text-dim">
          The map is drawn from the project&rsquo;s database, which isn&rsquo;t
          set up yet.{" "}
          <Link
            href={`/projects/${slug}/database`}
            className="underline underline-offset-4 hover:text-paper"
          >
            Connect and provision it
          </Link>{" "}
          first.
        </p>
      ) : (
        <MapView
          slug={slug}
          script={{
            code: script.code,
            extensions: script.extensions,
            source: script.source,
            key: `${script.source}:${script.version}`,
          }}
          parameters={parameters}
          theme={{
            void: theme.void,
            paper: theme.paper,
            dim: theme.dim,
            fontStack: FONTS[theme.font].stack,
          }}
          noun={lexicon.noun}
          nounPlural={lexicon.nounPlural}
          database={database}
        />
      )}
    </main>
  );
}
