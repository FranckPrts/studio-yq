import Link from "next/link";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import type { Parameter } from "@/lib/params/types";
import { gmailConfigured } from "@/lib/report/gmail";
import { reportScript } from "@/lib/report/mini-script";
import { REPORT_NOTICE, REPORT_NOTICE_VERSION } from "@/lib/report/notice";
import { recentRuns, sendingStatus, teamMembers } from "@/lib/report/sending";
import { coerceLexicon, coerceTheme, FONTS } from "@/lib/theme/project-theme";
import PageHeader from "../../page-header";
import { acknowledgeNotice, disconnectGmailAction, withdrawNotice } from "./actions";
import SendConsole from "./send-console";
import { buttonClass } from "@/design";

export const dynamic = "force-dynamic";

const KIND_LABEL = {
  TEST: "test to the team",
  REHEARSAL: "rehearsal to the team",
  PARTICIPANTS: "chosen participants",
  EVERYONE: "everyone",
} as const;

function when(date: Date | string): string {
  return new Date(date).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/**
 * Sending participant reports. Three gates stand in front of it, in order: a
 * collaborator's agreement that addresses pass through studio-yq, a Gmail account to
 * send from, and — for anything that reaches participants — a test of the saved
 * text to the team.
 */
export default async function SendPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gmail?: string; gmail_error?: string }>;
}) {
  const { slug } = await params;
  const { gmail: justConnected, gmail_error: gmailError } = await searchParams;
  const access = await requireProjectRole(slug, "VIEWER");
  // Any collaborator may agree to the notice, connect Gmail and send; each of
  // those records who did it, and the page names them.
  const canSend = access.role === "OWNER" || access.role === "COLLABORATOR";

  const [project, script, status, team, runs] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: {
        name: true,
        theme: true,
        lexicon: true,
        connection: { select: { projectUrl: true, publishableKey: true, provisionedAt: true } },
        scripts: { orderBy: { version: "desc" }, take: 1, select: { parameters: true } },
      },
    }),
    reportScript(access.projectId),
    sendingStatus(access.projectId),
    teamMembers(access.projectId),
    recentRuns(access.projectId),
  ]);

  const connector = status.gmail?.connectedById
    ? await db.user.findUnique({
        where: { id: status.gmail.connectedById },
        select: { email: true, displayName: true },
      })
    : null;

  const lexicon = coerceLexicon(project.lexicon);
  const theme = coerceTheme(project.theme);
  const parameters = (project.scripts[0]?.parameters ?? []) as unknown as Parameter[];
  const c = project.connection;
  const database =
    c?.projectUrl && c.publishableKey && c.provisionedAt
      ? { projectUrl: c.projectUrl, publishableKey: c.publishableKey }
      : null;
  const ready = status.notice.current && !!status.gmail;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-4 md:p-8">
      <PageHeader
        title="send"
        subtitle="One email per participant, from your Gmail. Nothing goes out without the checks below."
      />

      {/* ── 1. The notice ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">
          1 · participants&rsquo; email addresses
        </h2>
        <div
          className={`flex flex-col gap-3 rounded p-4 text-xs leading-relaxed ${
            status.notice.current ? "bg-surface" : "bg-warning-surface"
          }`}
        >
          {REPORT_NOTICE.map((p) => (
            <p key={p} className="max-w-prose text-paper/85">
              {p}
            </p>
          ))}
          {status.notice.current ? (
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-paper/10 pt-3">
              <p className="text-success">
                Agreed by {status.notice.by?.displayName || status.notice.by?.email || "a former member"}{" "}
                on {when(status.notice.at!)} (notice v{status.notice.version}).
              </p>
              {canSend && (
                <form action={withdrawNotice}>
                  <input type="hidden" name="slug" value={slug} />
                  <button className="text-dim underline-offset-4 hover:text-paper hover:underline">
                    withdraw — stops all sending
                  </button>
                </form>
              )}
            </div>
          ) : canSend ? (
            <form action={acknowledgeNotice} className="border-t border-paper/10 pt-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="version" value={REPORT_NOTICE_VERSION} />
              {status.notice.version && (
                <p className="mb-2 text-warning/90">
                  The notice changed since this project agreed to v{status.notice.version} — it needs agreeing again.
                </p>
              )}
              <button className={buttonClass("boxed")}>
                I agree, on behalf of this project
              </button>
              <p className="mt-1 text-[11px] text-dim">
                Recorded with your name and the time. Any collaborator can withdraw it.
              </p>
            </form>
          ) : (
            <p className="border-t border-paper/10 pt-3 text-warning/90">
              Not agreed yet. You are a viewer, so you can&rsquo;t agree — ask a collaborator or owner.
            </p>
          )}
        </div>
      </section>

      {/* ── 2. Gmail ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">2 · sending account</h2>
        <div className="flex flex-col gap-2 text-xs leading-relaxed">
          {gmailError && (
            <p role="alert" className="text-danger">
              Connecting Gmail failed: {gmailError}
            </p>
          )}
          {justConnected && status.gmail && <p className="text-success">Gmail connected.</p>}
          {status.gmail ? (
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p>
                Sending as <span className="text-paper">{status.gmail.googleEmail}</span>
                <span className="text-dim">
                  {" "}
                  — connected by {connector?.displayName || connector?.email || "a former member"} on{" "}
                  {when(status.gmail.updatedAt)}. It can send as this account, never read it.
                </span>
              </p>
              {canSend && (
                <div className="flex gap-4">
                  <a
                    href={`/api/connect/google/start?project=${slug}`}
                    className="text-dim underline-offset-4 hover:text-paper hover:underline"
                  >
                    reconnect
                  </a>
                  <form action={disconnectGmailAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <button className="text-dim underline-offset-4 hover:text-paper hover:underline">
                      disconnect
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : !gmailConfigured() ? (
            <p className="text-warning/90">
              Gmail sending isn&rsquo;t set up on this server yet — it needs the{" "}
              <code>GOOGLE_OAUTH_*</code> settings in <code>.env.example</code>.
            </p>
          ) : canSend ? (
            <p>
              <a
                href={`/api/connect/google/start?project=${slug}`}
                className={buttonClass("boxed")}
              >
                connect a Gmail account
              </a>
              <span className="text-dim">
                {" "}
                — reports go out from it, and replies come back to it unless the email sets a
                reply-to. Only permission to send is asked for.
              </span>
            </p>
          ) : (
            <p className="text-warning/90">No account connected. You are a viewer, so you can&rsquo;t connect one — ask a collaborator or owner.</p>
          )}
        </div>
      </section>

      {/* ── 3. Sending ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs text-dim">3 · send</h2>
        <p className="max-w-prose text-[11px] leading-relaxed text-dim">
          Sends the{" "}
          <Link
            href={`/projects/${slug}/report/email`}
            className="underline underline-offset-4 hover:text-paper"
          >
            saved email text
          </Link>
          , not a draft. Each email is drawn in this tab, so keep it open and in view until a send
          finishes.
        </p>
        {!canSend ? (
          <p className="text-xs text-dim">You are a viewer on this project, so you can&rsquo;t send — ask an owner to make you a collaborator.</p>
        ) : !ready ? (
          <p className="text-xs text-warning/90">Sending opens once 1 and 2 are done.</p>
        ) : !script || !database ? (
          <p className="text-xs text-warning/90">
            Sending needs the project&rsquo;s script and database set up.
          </p>
        ) : (
          <SendConsole
            slug={slug}
            team={team}
            projectName={project.name}
            theme={{ ...theme, fontStack: FONTS[theme.font].stack }}
            look={status.template.look}
            noun={lexicon.noun}
            nounPlural={lexicon.nounPlural}
            answerKeys={parameters.filter((p) => p.type === "text").map((p) => p.name)}
            parameters={parameters}
            script={{
              code: script.code,
              extensions: script.extensions,
              source: script.source,
              key: `${script.source}:${script.version}`,
            }}
            database={database}
            testedAt={status.testedAt?.toISOString() ?? null}
          />
        )}
      </section>

      {/* ── History ───────────────────────────────────────────────────── */}
      {runs.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-paper/10 pt-8">
          <h2 className="text-xs text-dim">sent so far</h2>
          <ul className="flex flex-col gap-2 text-xs">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-paper/10 pb-2"
              >
                <span>
                  {KIND_LABEL[r.kind]}{" "}
                  <span className="text-dim">
                    · {r.sent} of {r.total} sent
                    {r.failed > 0 && <span className="text-danger"> · {r.failed} failed</span>}
                    {r.state !== "finished" && ` · ${r.state}`}
                  </span>
                </span>
                <span className="text-dim">
                  {when(r.createdAt)} · {r.by}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-dim">
            The log keeps participant IDs and outcomes only — never an address.
          </p>
        </section>
      )}
    </main>
  );
}
