import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import {
  accessTokenFor,
  credentialsReadable,
  getAuthConfig,
  listSupabaseProjects,
  SCOPE_PURPOSE,
  SupabaseApiError,
} from "@/lib/supabase/management";
import PageHeader from "../page-header";
import ConnectionSection, { type ConnectionView } from "./section";
import ProvisionSection from "./provision-section";
import DangerSection, { type LiveState } from "./danger-section";
import { inspectSpoke } from "@/lib/spoke/inspect";
import { SCHEMA_VERSION, sceneSnippet } from "@/lib/spoke/schema";
import { databaseActors } from "@/lib/projects/setup-actors";

export const dynamic = "force-dynamic";

/**
 * Reads the account's project list, if the connection can still do so. A failure
 * here is information, not a crash: the page should say what went wrong with
 * the reconnect button still reachable.
 */
async function connectionView(connection: {
  id: string;
  projectRef: string | null;
  provisionedAt: Date | null;
  secretKeyEnc: string | null;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  keyVersion: number;
} | null): Promise<ConnectionView> {
  if (!connection || !connection.accessTokenEnc) {
    return {
      connected: false,
      broken: false,
      projectRef: null,
      provisioned: false,
      hasSecretKey: false,
      available: null,
      listError: null,
    };
  }

  const base = {
    connected: true,
    projectRef: connection.projectRef,
    provisioned: !!connection.provisionedAt,
    hasSecretKey: !!connection.secretKeyEnc,
    broken: false,
  };

  // Checked before any network call: an unreadable token would only fail
  // further down with a message about Supabase, which is not what is wrong.
  if (!credentialsReadable(connection)) {
    return { ...base, broken: true, available: null, listError: null };
  }

  try {
    const token = await accessTokenFor(connection.id);
    const projects = await listSupabaseProjects(token);
    return {
      ...base,
      available: projects.map((p) => ({
        ref: p.ref,
        name: p.name,
        region: p.region,
      })),
      listError: null,
    };
  } catch (error) {
    // Expected and explainable, so `warn` — `console.error` would raise Next's
    // dev error overlay over something the page already handles.
    console.warn("[supabase] listing projects failed:", error);

    if (error instanceof SupabaseApiError) {
      const missing = error.missingScopes;
      if (missing) {
        const named = missing
          .map((s) => `${s}${SCOPE_PURPOSE[s] ? ` (to ${SCOPE_PURPOSE[s]})` : ""}`)
          .join(", ");
        return {
          ...base,
          available: null,
          listError: `Your Supabase OAuth app is missing the scope ${named}. Add it in the Supabase dashboard under organization → OAuth Apps, then disconnect and connect again — a token only carries the scopes it was granted at authorisation.`,
        };
      }
      if (error.status === 401) {
        return {
          ...base,
          available: null,
          listError:
            "Supabase rejected this authorisation. Disconnect and connect again.",
        };
      }
    }

    return {
      ...base,
      available: null,
      listError:
        "Could not reach Supabase to list this account's projects. Try again shortly.",
    };
  }
}

/**
 * Asks the database what it actually contains. Never throws into the page: an
 * unreachable database is a line of text, not a stack trace, and the reconnect
 * and provision controls must stay usable while it is down.
 */
async function liveState(connection: {
  id: string;
  projectRef: string | null;
  provisionedAt: Date | null;
  accessTokenEnc: string | null;
} | null): Promise<LiveState> {
  const blank: LiveState = {
    reachable: false,
    error: null,
    installed: false,
    avatars: { exists: false, rows: null, rlsEnabled: false, policies: 0 },
    scores: { exists: false, rows: null, rlsEnabled: false, policies: 0 },
    contacts: { exists: false, rows: null, rlsEnabled: false, policies: 0 },
    stagedCount: null,
    drifted: false,
  };
  if (!connection?.projectRef || !connection.accessTokenEnc) return blank;

  try {
    const token = await accessTokenFor(connection.id);
    const state = await inspectSpoke(connection.projectRef, token);
    return {
      reachable: true,
      error: null,
      installed: state.installed,
      avatars: {
        exists: state.avatars.exists,
        rows: state.avatars.rows,
        rlsEnabled: state.avatars.rlsEnabled,
        policies: state.avatars.policies,
      },
      scores: {
        exists: state.scores.exists,
        rows: state.scores.rows,
        rlsEnabled: state.scores.rlsEnabled,
        policies: state.scores.policies,
      },
      contacts: {
        exists: state.contacts.exists,
        rows: state.contacts.rows,
        rlsEnabled: state.contacts.rlsEnabled,
        policies: state.contacts.policies,
      },
      stagedCount: state.stagedCount,
      drifted: !!connection.provisionedAt && !state.installed,
    };
  } catch (error) {
    console.warn("[supabase] inspecting the database failed:", error);
    return {
      ...blank,
      error:
        "Could not read the database just now — the authorisation may need renewing.",
    };
  }
}

/**
 * The project's anonymous sign-in limit as Supabase has it now, so the form
 * starts from the real number rather than a guess. Null when it cannot be read.
 */
async function anonRateLimit(connection: {
  id: string;
  projectRef: string | null;
  provisionedAt: Date | null;
  accessTokenEnc: string | null;
} | null): Promise<number | null> {
  if (!connection?.projectRef || !connection.provisionedAt) return null;
  if (!connection.accessTokenEnc) return null;
  try {
    const token = await accessTokenFor(connection.id);
    const config = await getAuthConfig(connection.projectRef, token);
    return config?.rate_limit_anonymous_users ?? null;
  } catch (error) {
    console.warn("[supabase] reading the auth config failed:", error);
    return null;
  }
}

export default async function DatabasePage({
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
      connection: {
        select: {
          id: true,
          projectRef: true,
          projectUrl: true,
          publishableKey: true,
          provisionedAt: true,
          schemaVersion: true,
          anonSignInsEnabled: true,
          secretKeyEnc: true,
          accessTokenEnc: true,
          refreshTokenEnc: true,
          keyVersion: true,
          connectedById: true,
          provisionedById: true,
        },
      },
    },
  });

  // Connecting and provisioning are shared work; wiping and disconnecting stay
  // with owners because they destroy participant data or strand the project.
  const canSetUp = access.role === "OWNER" || access.role === "COLLABORATOR";
  const canDestroy = access.role === "OWNER";
  const actors = await databaseActors(project.connection);
  const byline = [
    actors.connectedBy && `connected by ${actors.connectedBy}`,
    actors.provisionedBy && `provisioned by ${actors.provisionedBy}`,
  ].filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <PageHeader title="database" />

      <p className="max-w-prose text-[11px] leading-relaxed text-dim">
        Participants and their avatars live in your own Supabase project, never
        here. This app needs enough access to create the tables and read them
        back; the secret key is encrypted at rest and never reaches a browser.
      </p>

      {!canSetUp && (
        <p className="max-w-prose text-[11px] leading-relaxed text-warning/80">
          You are a viewer on this project, so you can see the database setup
          but not change it. Ask an owner to make you a collaborator.
        </p>
      )}

      {byline.length > 0 && (
        <p className="text-[11px] text-dim">{byline.join(" · ")}</p>
      )}

      <ConnectionSection
        slug={slug}
        view={await connectionView(project.connection)}
        canEdit={canSetUp}
      />

      <section className="flex flex-col gap-4 border-t border-paper/10 pt-6">
        <h2 className="text-xs text-dim">tables &amp; policies</h2>
        <ProvisionSection
          slug={slug}
          canEdit={canSetUp}
          view={{
            ready: !!project.connection?.projectRef,
            provisioned: !!project.connection?.provisionedAt,
            schemaVersion: project.connection?.schemaVersion ?? null,
            currentVersion: SCHEMA_VERSION,
            anonEnabled: !!project.connection?.anonSignInsEnabled,
            anonRateLimit: await anonRateLimit(project.connection),
            sceneSnippet:
              project.connection?.projectUrl &&
              project.connection?.publishableKey
                ? sceneSnippet({
                    projectUrl: project.connection.projectUrl,
                    publishableKey: project.connection.publishableKey,
                  })
                : null,
          }}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-paper/10 pt-6">
        <DangerSection
          slug={slug}
          canEdit={canDestroy}
          isOpen={project.openForParticipation}
          live={await liveState(project.connection)}
        />
      </section>
    </main>
  );
}
