import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceLexicon, coerceTheme, FONTS } from "@/lib/theme/project-theme";
import { RenameForm } from "./settings-form";
import PageHeader from "./page-header";
import ParticipationToggle from "./participation-toggle";
import { projectReadiness } from "@/lib/projects/readiness";
import { pendingInvitations } from "@/lib/auth/invitations";
import { buttonClass } from "@/design";
import MembersSection from "./members-section";
import { credentialsReadable } from "@/lib/supabase/management";

export const dynamic = "force-dynamic";

/** One line per bucket: what it is, and whether it is ready. */
function Bucket({
  href,
  title,
  state,
  ready,
  blurb,
}: {
  href: string;
  title: string;
  state: string;
  ready: boolean;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 border-b border-paper/10 pb-3 hover:border-paper/30"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-paper">{title}</span>
        <span className={`shrink-0 text-xs ${ready ? "text-dim" : "text-amber-400/80"}`}>
          {state}
        </span>
      </div>
      <span className="text-[11px] leading-relaxed text-dim">{blurb}</span>
    </Link>
  );
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const project = await db.project.findUniqueOrThrow({
    where: { id: access.projectId },
    include: {
      connection: {
        select: {
          id: true,
          projectRef: true,
          provisionedAt: true,
          accessTokenEnc: true,
          refreshTokenEnc: true,
          secretKeyEnc: true,
          keyVersion: true,
        },
      },
      scripts: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true, parameters: true },
      },
      members: {
        include: { user: { select: { email: true, displayName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const theme = coerceTheme(project.theme);
  const lexicon = coerceLexicon(project.lexicon);
  const script = project.scripts[0];
  const connection = project.connection;
  const isOwner = access.role === "OWNER";
  const readiness = await projectReadiness(access.projectId);
  const base = process.env.APP_BASE_URL ?? "http://localhost:3100";

  const needsReconnect = !!connection && !credentialsReadable(connection);
  const connectionState = !connection?.accessTokenEnc
    ? "not connected"
    : needsReconnect
      ? "reconnect needed"
      : !connection.projectRef
        ? "no target chosen"
        : connection.provisionedAt
          ? `${connection.projectRef} · provisioned`
          : `${connection.projectRef} · not provisioned`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <PageHeader
        title="overview"
        subtitle={`${project.slug} · you are ${access.role.toLowerCase()}${
          access.viaPlatformAdmin ? " (as administrator)" : ""
        }`}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">participation</h2>
        <ParticipationToggle
          slug={project.slug}
          open={project.openForParticipation}
          canEdit={isOwner}
          missing={readiness.missing}
          publicUrl={`${base}/p/${project.slug}`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">run</h2>
        {/* Each opens in its own tab — the console on a second screen, the
            board on a projector — so neither carries the project menu. */}
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Link
            href={`/projects/${slug}/console`}
            target="_blank"
            className={buttonClass("action")}
          >
            open live console ↗
          </Link>
          <Link
            href={`/projects/${slug}/board`}
            target="_blank"
            className={buttonClass("action")}
          >
            open leaderboard ↗
          </Link>
        </div>
        <p className="text-[11px] leading-relaxed text-dim">
          The console is for whoever is running the session; the leaderboard is
          what the room sees. Both open in a new tab.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">the three parts</h2>
        <Bucket
          href={`/projects/${slug}/participant-frontend/colours`}
          title="style &amp; language"
          state={`${lexicon.noun} · ${FONTS[theme.font].label.toLowerCase()}`}
          ready
          blurb="The palette, typeface and the word for what participants make."
        />
        <Bucket
          href={`/projects/${slug}/visual`}
          title="script &amp; parameters"
          state={
            script
              ? `v${script.version} · ${(script.parameters as unknown[]).length} parameters`
              : "no script"
          }
          ready={!!script}
          blurb="The p5 sketch, and which of its knobs a participant may turn."
        />
        <Bucket
          href={`/projects/${slug}/database`}
          title="database"
          state={connectionState}
          ready={!!connection?.provisionedAt && !needsReconnect}
          blurb="Your Supabase project, where participants and their avatars live."
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">name</h2>
        <RenameForm slug={project.slug} name={project.name} canRename={isOwner} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">members</h2>
        <MembersSection
          slug={project.slug}
          canEdit={isOwner}
          members={project.members.map((m) => ({
            userId: m.userId,
            label: m.user.displayName ?? m.user.email,
            role: m.role,
            isYou: m.userId === access.user.id,
          }))}
          pending={
            isOwner
              ? (await pendingInvitations(access.projectId)).map((p) => ({
                  id: p.id,
                  email: p.email,
                  role: p.role,
                  expires: p.expiresAt.toISOString().slice(0, 10),
                }))
              : []
          }
        />
      </section>
    </main>
  );
}
