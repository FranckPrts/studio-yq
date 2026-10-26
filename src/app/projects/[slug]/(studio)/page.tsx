import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { coerceLexicon, coerceTheme, FONTS } from "@/lib/theme/project-theme";
import { RenameForm } from "./settings-form";
import PageHeader from "./page-header";
import ParticipationToggle from "./participation-toggle";
import ConclusionToggle from "./conclusion-toggle";
import { projectReadiness } from "@/lib/projects/readiness";
import { pendingInvitations } from "@/lib/auth/invitations";
import MembersSection from "./members-section";
import DeleteSection from "./delete-section";
import { credentialsReadable } from "@/lib/supabase/management";
import SetupChecklist, { setupSteps } from "./setup-checklist";

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
        <span className={`shrink-0 text-xs ${ready ? "text-dim" : "text-warning/80"}`}>
          {state}
        </span>
      </div>
      <span className="text-[11px] leading-relaxed text-dim">{blurb}</span>
    </Link>
  );
}

export default async function ProjectSettingsPage({
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
      gmail: { select: { googleEmail: true } },
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
  const canDelete = isOwner || access.user.isPlatformAdmin;
  const canOperate = isOwner || access.role === "COLLABORATOR";
  const readiness = await projectReadiness(access.projectId);
  const base = process.env.APP_BASE_URL ?? "http://localhost:3100";

  const needsReconnect = !!connection && !credentialsReadable(connection);
  const databaseReady = !!connection?.provisionedAt && !needsReconnect;
  const pending = isOwner ? await pendingInvitations(access.projectId) : [];
  // While closed, the page leads with the setup in order; once open it is the
  // overview it always was. The three-part summary would repeat the checklist.
  const settingUp = !project.openForParticipation;

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
        title="settings"
        subtitle={`${project.slug} · you are ${access.role.toLowerCase()}${
          access.viaPlatformAdmin ? " (as administrator)" : ""
        }`}
      />

      {settingUp && (
        <SetupChecklist
          steps={setupSteps({
            slug: project.slug,
            databaseReady,
            databaseState: connectionState,
            hasScript: !!script,
            parameterCount: script ? (script.parameters as unknown[]).length : 0,
            hasTeam: project.members.length > 1 || pending.length > 0,
            open: project.openForParticipation,
          })}
        />
      )}

      <section id="participation" className="flex scroll-mt-8 flex-col gap-4">
        <h2 className="text-xs text-dim">participation</h2>
        <ParticipationToggle
          slug={project.slug}
          open={project.openForParticipation}
          canEdit={canOperate}
          missing={readiness.missing}
          publicUrl={`${base}/p/${project.slug}`}
        />
        <ConclusionToggle
          slug={project.slug}
          publishedAt={project.conclusionPublishedAt?.toISOString() ?? null}
          open={project.openForParticipation}
          canEdit={canOperate}
          conclusionUrl={`${base}/p/${project.slug}/conclusion`}
        />
      </section>

      {!settingUp && (
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
            ready={databaseReady}
            blurb="Your Supabase project, where participants and their avatars live."
          />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-dim">name</h2>
        <RenameForm
          slug={project.slug}
          name={project.name}
          canRename={isOwner}
        />
      </section>

      <section id="members" className="flex scroll-mt-8 flex-col gap-3">
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
              ? pending.map((p) => ({
                  id: p.id,
                  email: p.email,
                  role: p.role,
                  expires: p.expiresAt.toISOString().slice(0, 10),
                }))
              : []
          }
        />
      </section>

      {canDelete && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-dim">danger zone</h2>
          <DeleteSection
            slug={project.slug}
            open={project.openForParticipation}
            supabaseRef={connection?.projectRef ?? null}
            gmailAddress={project.gmail?.googleEmail ?? null}
          />
        </section>
      )}
    </main>
  );
}
