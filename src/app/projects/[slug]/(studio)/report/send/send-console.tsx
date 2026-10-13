"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Parameter } from "@/lib/params/types";
import { buildReportImages } from "@/lib/report/email-images";
import { emailValues } from "@/lib/report/email-values";
import type { EmailLook } from "@/lib/report/email-template";
import { histogramStyle } from "@/lib/report/histogram-render";
import { layoutMap } from "@/lib/report/map-layout";
import { peopleOf, statsOf, type Person } from "@/lib/report/people";
import { freezeRoom, type RoomDatabase } from "@/lib/report/room";
import type { RunRequest } from "@/lib/report/sending";
import type { FontKey, ProjectTheme } from "@/lib/theme/project-theme";
import {
  CapturingNotice,
  PersonSearch,
  useReportRoom,
  type ReportScriptInfo,
} from "../use-report-room";
import { finishRunAction, loadAudience, startRun, stopRunAction } from "./actions";

type TeamMember = { userId: string; name: string; email: string; role: "OWNER" | "COLLABORATOR" | "VIEWER" };
type Recipient = { type: "team"; userId: string } | { type: "participant"; owner: string };

/** Seconds between confirming "everyone" and the first email. */
const COUNTDOWN = 10;

type Progress = {
  label: string;
  total: number;
  done: number;
  sent: number;
  failed: { name: string; error: string }[];
  current: string | null;
  state: "running" | "stopped" | "finished" | "refused";
  message?: string;
};

export default function SendConsole({
  slug,
  isOwner,
  team,
  projectName,
  theme,
  look,
  noun,
  nounPlural,
  answerKeys,
  parameters,
  script,
  database,
  testedAt,
}: {
  slug: string;
  isOwner: boolean;
  team: TeamMember[];
  projectName: string;
  theme: ProjectTheme & { font: FontKey; fontStack: string };
  look: EmailLook;
  noun: string;
  nounPlural: string;
  answerKeys: string[];
  parameters: Parameter[];
  script: ReportScriptInfo;
  database: RoomDatabase;
  testedAt: string | null;
}) {
  const { room, loadError, people, queue, sprites, raw, font } = useReportRoom({
    database,
    parameters,
    script,
    fontStack: theme.fontStack,
  });

  // ---- audience: who has an address (ids only), who already got theirs ----
  const [audience, setAudience] = useState<{ reachable: Set<string>; sent: Set<string> } | null>(null);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [audienceRun, setAudienceRun] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadAudience(slug).then((r) => {
      if (cancelled) return;
      if (r.ok) setAudience({ reachable: new Set(r.reachable), sent: new Set(r.alreadySent) });
      else setAudienceError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, audienceRun]);

  const picturesReady = !!room && !!font && !queue.current;
  // Who a team test shows by default: the first person who played — the
  // fuller email.
  const firstPlayed = useMemo(() => {
    if (!room) return null;
    const played = new Set(room.runs.flatMap((r) => [r.a, r.b]));
    return people.find((p) => p.avatars.some((a) => played.has(a.id)))?.owner ?? people[0]?.owner ?? null;
  }, [room, people]);
  const failedPictures = useMemo(
    () => (room ? room.avatars.filter((a) => { const r = queue.resultOf(a); return r && "error" in r; }).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, queue.current],
  );

  // ---- running a send ----
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);
  const running = progress?.state === "running";

  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function execute(label: string, request: RunRequest): Promise<string | null> {
    if (!room || !font) return "Still reading the room.";
    const started = await startRun(slug, request);
    if (!started.ok) return started.error;

    const frozen = freezeRoom(room, started.frozenAt);
    const layout = layoutMap(frozen);
    const byOwner = new Map(peopleOf(frozen).map((p) => [p.owner, p]));
    const style = { ground: theme.void, paper: theme.paper, dim: theme.dim, font };
    const imageCache = new Map<string, ReturnType<typeof buildReportImages>>();

    stopRef.current = false;
    let state: Progress = {
      label,
      total: started.plan.length,
      done: 0,
      sent: 0,
      failed: [],
      current: null,
      state: "running",
      message: started.skipped ? `${started.skipped} skipped — no email address on file.` : undefined,
    };
    setProgress(state);
    const update = (next: Partial<Progress>) => {
      state = { ...state, ...next };
      setProgress(state);
    };

    for (const key of started.plan) {
      if (stopRef.current) {
        await stopRunAction(slug, started.runId);
        update({ state: "stopped", current: null });
        return null;
      }
      const parts = key.split(":");
      const owner = parts[0] === "t" ? parts[2] : parts[1];
      const teamName = parts[0] === "t" ? team.find((m) => m.userId === parts[1])?.name : null;
      const person = byOwner.get(owner);
      const name = person ? person.names.join(" · ") : "someone";
      update({ current: teamName ? `${name} → ${teamName}` : name });

      let result: { status?: string; error?: string; refused?: boolean };
      if (!person) {
        result = { status: "failed", error: "Not in the room when this send began." };
      } else {
        const stats = statsOf(frozen, person);
        let images = imageCache.get(owner);
        if (!images) {
          images = buildReportImages({
            room: frozen,
            layout,
            person,
            stats,
            map: { style, sprites },
            portraits: raw,
            ground: theme.void,
            histogram: histogramStyle(look, theme, font),
          });
          imageCache.set(owner, images);
        }
        const values = emailValues(person, stats, { project: projectName, noun, nounPlural, answerKeys });
        try {
          const res = await fetch(`/api/projects/${slug}/report/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: started.runId,
              recipientKey: key,
              values,
              played: stats.runs > 0,
              images: Object.fromEntries(
                Object.entries(images).map(([k, v]) => [k, { dataUrl: v.src, width: v.width, alt: v.alt }]),
              ),
            }),
          });
          result = await res.json().catch(() => ({ status: "failed", error: `HTTP ${res.status}` }));
        } catch {
          result = { status: "failed", error: "Network error." };
        }
      }

      if (result.refused) {
        // Something upstream changed — notice withdrawn, Gmail disconnected,
        // run stopped elsewhere. Nothing after this would go either.
        update({ state: "refused", current: null, message: result.error });
        return null;
      }
      const ok = result.status === "sent" || result.status === "already";
      update({
        done: state.done + 1,
        sent: state.sent + (ok ? 1 : 0),
        failed: ok ? state.failed : [...state.failed, { name: state.current ?? name, error: result.error ?? "Failed." }],
      });
    }

    await finishRunAction(slug, started.runId);
    update({ state: "finished", current: null });
    setAudienceRun((n) => n + 1);
    return null;
  }

  if (loadError) {
    return <p role="alert" className="text-xs text-red-400">Couldn&rsquo;t read the room: {loadError}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <CapturingNotice queue={queue} script={script} ground={theme.void} />
      {!picturesReady && !queue.current && <p className="text-xs text-dim">Reading the room…</p>}
      {audienceError && <p role="alert" className="text-xs text-red-400">{audienceError}</p>}

      {progress && (
        <RunProgress
          progress={progress}
          onStop={() => {
            stopRef.current = true;
          }}
          onDismiss={() => setProgress(null)}
        />
      )}

      <SendTo
        isOwner={isOwner}
        team={team}
        people={people}
        firstPlayed={firstPlayed}
        audience={audience}
        noun={noun}
        busy={running || !picturesReady}
        testedAt={testedAt}
        execute={execute}
      />

      {isOwner && (
        <Everyone
          slug={slug}
          audience={audience}
          picturesReady={picturesReady}
          failedPictures={failedPictures}
          testedAt={testedAt}
          busy={running}
          nounPlural={nounPlural}
          execute={execute}
        />
      )}
    </div>
  );
}

// ─── "Send to" ───────────────────────────────────────────────────────────────

function SendTo({
  isOwner,
  team,
  people,
  firstPlayed,
  audience,
  noun,
  busy,
  testedAt,
  execute,
}: {
  isOwner: boolean;
  team: TeamMember[];
  people: Person[];
  firstPlayed: string | null;
  audience: { reachable: Set<string>; sent: Set<string> } | null;
  noun: string;
  busy: boolean;
  testedAt: string | null;
  execute: (label: string, request: RunRequest) => Promise<string | null>;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [query, setQuery] = useState("");
  const [reportOf, setReportOf] = useState<string | null>(null);
  const [rehearsal, setRehearsal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [realPeople, setRealPeople] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const has = (r: Recipient) =>
    recipients.some((x) =>
      x.type === "team" && r.type === "team" ? x.userId === r.userId : x.type === "participant" && r.type === "participant" && x.owner === r.owner,
    );

  // One search over the team — the owner included — and the participants.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const teamHits = team
      .filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .map((m) => ({ recipient: { type: "team", userId: m.userId } as Recipient, label: m.name, tag: m.role === "OWNER" ? "owner" : "team", note: m.email }));
    const peopleHits = people
      .filter((p) => p.names.some((n) => n.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((p) => ({
        recipient: { type: "participant", owner: p.owner } as Recipient,
        label: p.names.join(" · "),
        tag: "participant",
        note: !audience
          ? ""
          : !audience.reachable.has(p.owner)
            ? "no email address"
            : audience.sent.has(p.owner)
              ? "already sent theirs"
              : "",
      }));
    return [...teamHits, ...peopleHits].filter((r) => !has(r.recipient));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, team, people, audience, recipients]);

  function add(r: Recipient) {
    if (r.type === "participant" && !isOwner) {
      setError("Only an owner can send to participants. Add someone from the team.");
      return;
    }
    setError(null);
    setConfirming(false);
    setRecipients((list) => (has(r) ? list : [...list, r]));
    setQuery("");
  }

  const teamChosen = recipients.filter((r): r is Extract<Recipient, { type: "team" }> => r.type === "team");
  const participantsChosen = recipients.filter((r): r is Extract<Recipient, { type: "participant" }> => r.type === "participant");
  const mixed = teamChosen.length > 0 && participantsChosen.length > 0;

  const subject = people.find((p) => p.owner === (reportOf ?? firstPlayed)) ?? null;

  const plan = useMemo(() => {
    if (mixed || recipients.length === 0) return null;
    if (teamChosen.length > 0) {
      return rehearsal
        ? { label: "rehearsal", count: teamChosen.length * people.length, request: { kind: "REHEARSAL", teamUserIds: teamChosen.map((t) => t.userId), subjectOwners: people.map((p) => p.owner) } as RunRequest }
        : subject
          ? { label: "test", count: teamChosen.length, request: { kind: "TEST", teamUserIds: teamChosen.map((t) => t.userId), subjectOwner: subject.owner } as RunRequest }
          : null;
    }
    return { label: "participants", count: participantsChosen.length, request: { kind: "PARTICIPANTS", owners: participantsChosen.map((p) => p.owner) } as RunRequest };
  }, [mixed, recipients, teamChosen, participantsChosen, rehearsal, subject, people]);

  async function send() {
    if (!plan) return;
    setError(null);
    const err = await execute(plan.label, plan.request);
    if (err) setError(err);
    else {
      setConfirming(false);
      setRealPeople(false);
      if (plan.label === "participants") setRecipients([]);
    }
  }

  const nameOf = (r: Recipient) =>
    r.type === "team"
      ? team.find((m) => m.userId === r.userId)?.name ?? "team member"
      : people.find((p) => p.owner === r.owner)?.names.join(" · ") ?? "participant";

  return (
    <div className="flex flex-col gap-4 rounded border border-paper/10 p-4 text-xs">
      <h3 className="text-sm">send to</h3>

      <div className="flex flex-wrap items-center gap-2">
        {recipients.map((r) => (
          <span
            key={r.type === "team" ? `t${r.userId}` : `p${r.owner}`}
            className={`flex items-center gap-1.5 rounded border px-2 py-0.5 ${r.type === "team" ? "border-paper/20" : "border-amber-500/50 text-amber-200"}`}
          >
            <span className="text-[10px] text-dim">{r.type === "team" ? "team" : "participant"}</span>
            {nameOf(r)}
            <button
              type="button"
              onClick={() => {
                setRecipients((list) => list.filter((x) => x !== r));
                setConfirming(false);
              }}
              className="text-dim hover:text-paper"
              aria-label={`Remove ${nameOf(r)}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative flex max-w-lg items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-dim">search the team, the owner, or participants by {noun} name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                add(results[0].recipient);
              }
            }}
            className="term-input border-b border-paper/20"
          />
        </label>
        <button
          type="button"
          disabled={!results[0]}
          onClick={() => results[0] && add(results[0].recipient)}
          className="text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          add
        </button>
        {results.length > 0 && (
          <ul className="absolute top-full left-0 z-10 mt-1 w-full border border-paper/15 bg-void">
            {results.map((r) => (
              <li key={r.recipient.type === "team" ? `t${r.recipient.userId}` : `p${r.recipient.owner}`}>
                <button
                  type="button"
                  onClick={() => add(r.recipient)}
                  disabled={r.tag === "participant" && !isOwner}
                  className="flex w-full items-baseline justify-between gap-3 px-2 py-1 text-left hover:bg-paper/10 disabled:opacity-40"
                >
                  <span className="truncate">
                    <span className="text-[10px] text-dim">{r.tag}</span> {r.label}
                  </span>
                  {r.note && <span className="shrink-0 text-[10px] text-dim">{r.note}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mixed && (
        <p className="text-amber-400/90">
          Team copies and participants&rsquo; own emails are sent separately — remove one kind.
        </p>
      )}

      {teamChosen.length > 0 && !mixed && (
        <div className="flex flex-col gap-2 border-t border-paper/10 pt-3">
          <span className="text-dim">the team receives — subject marked [test]:</span>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!rehearsal} onChange={() => setRehearsal(false)} />
            <span>
              the report of <span className="text-paper">{subject?.names.join(" · ") ?? "—"}</span>
            </span>
          </label>
          {!rehearsal && (
            <div className="pl-6">
              <PersonSearch people={people} onPick={setReportOf} noun={noun} />
            </div>
          )}
          <label className="flex items-center gap-2">
            <input type="radio" checked={rehearsal} onChange={() => setRehearsal(true)} />
            every participant&rsquo;s report, one email each — {people.length} per person
          </label>
        </div>
      )}

      {participantsChosen.length > 0 && !mixed && !testedAt && (
        <p className="text-amber-400/90">
          Send the team a test of the current saved text first — participants&rsquo; emails wait for one.
        </p>
      )}

      {error && <p role="alert" className="text-red-400">{error}</p>}

      {plan && !confirming && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="self-start text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
        >
          send {plan.count} {plan.count === 1 ? "email" : "emails"}…
        </button>
      )}

      {plan && confirming && (
        <div className={`flex flex-col gap-2 rounded border p-3 ${plan.label === "participants" ? "border-amber-500/50" : "border-paper/20"}`}>
          <p>
            {plan.label === "participants"
              ? `${plan.count} real ${plan.count === 1 ? "participant" : "participants"} will receive their own report: ${participantsChosen.map(nameOf).join(", ")}.`
              : plan.label === "rehearsal"
                ? `${plan.count} emails — every participant's report — to ${teamChosen.map(nameOf).join(", ")}.`
                : `${subject?.names.join(" · ")}'s report to ${teamChosen.map(nameOf).join(", ")}.`}
          </p>
          {plan.label === "participants" && (
            <label className="flex items-center gap-2 text-amber-200">
              <input type="checkbox" checked={realPeople} onChange={(e) => setRealPeople(e.target.checked)} />
              These are real people, and this can&rsquo;t be unsent.
            </label>
          )}
          <div className="flex gap-4">
            <button
              type="button"
              disabled={busy || (plan.label === "participants" && !realPeople)}
              onClick={send}
              className="text-sm text-paper underline underline-offset-4 disabled:text-dim disabled:no-underline"
            >
              send now
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-dim hover:text-paper">
              cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Everyone ────────────────────────────────────────────────────────────────

function Everyone({
  slug,
  audience,
  picturesReady,
  failedPictures,
  testedAt,
  busy,
  nounPlural,
  execute,
}: {
  slug: string;
  audience: { reachable: Set<string>; sent: Set<string> } | null;
  picturesReady: boolean;
  failedPictures: number;
  testedAt: string | null;
  busy: boolean;
  nounPlural: string;
  execute: (label: string, request: RunRequest) => Promise<string | null>;
}) {
  const [includeSent, setIncludeSent] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");
  const [typedCount, setTypedCount] = useState("");
  const [checkedPreview, setCheckedPreview] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reachable = audience?.reachable.size ?? 0;
  const already = audience ? [...audience.reachable].filter((o) => audience.sent.has(o)).length : 0;
  const count = includeSent ? reachable : reachable - already;

  const checks = [
    { ok: true, text: "An owner agreed to the notice about participant emails" },
    { ok: true, text: "A Gmail account is connected" },
    { ok: !!testedAt, text: testedAt ? "The team received a test of the current saved text" : "Send the team a test of the current saved text (above)" },
    {
      ok: picturesReady,
      text: picturesReady
        ? `Every mini-avatar photographed${failedPictures ? ` — ${failedPictures} failed, and go without a portrait` : ""}`
        : "Mini-avatars still being photographed",
    },
    { ok: !!audience && count > 0, text: audience ? `${count} participants will receive it` : "Counting who has an email address…" },
  ];
  const allChecked = checks.every((c) => c.ok);
  const typedOk = typedSlug.trim() === slug && Number(typedCount) === count;
  const armed = allChecked && typedOk && checkedPreview && !busy;

  function fire() {
    execute("everyone", {
      kind: "EVERYONE",
      typedSlug,
      typedCount: Number(typedCount),
      includeAlreadySent: includeSent,
      checkedPreview,
    }).then((err) => {
      if (err) setError(err);
      else {
        setTypedSlug("");
        setTypedCount("");
        setCheckedPreview(false);
      }
    });
  }

  // One tick a second; the last one sends. Cancelling clears `countdown`,
  // which cancels the pending tick with it.
  useEffect(() => {
    if (countdown === null) return;
    const t = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        fire();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => window.clearTimeout(t);
    // Only the tick drives this; the form is read when it reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  return (
    <div className="flex flex-col gap-4 rounded border border-red-500/40 p-4 text-xs">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-red-300">send to everyone</h3>
        <p className="text-dim">
          Every participant with an email address gets their own report. It can&rsquo;t be unsent.
        </p>
      </div>

      <ul className="flex flex-col gap-1">
        {checks.map((c) => (
          <li key={c.text} className={c.ok ? "text-emerald-400/90" : "text-amber-400/90"}>
            {c.ok ? "✓" : "○"} {c.text}
          </li>
        ))}
      </ul>

      {audience && already > 0 && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={includeSent} onChange={(e) => setIncludeSent(e.target.checked)} />
          also send again to the {already} who already received theirs
        </label>
      )}
      {audience && (
        <p className="text-dim">
          {reachable} of the room gave an email address; {nounPlural} without one are skipped.
        </p>
      )}

      <div className="grid max-w-lg gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-dim">
            type the project&rsquo;s name: <code className="text-paper/80">{slug}</code>
          </span>
          <input
            value={typedSlug}
            disabled={countdown !== null}
            onChange={(e) => setTypedSlug(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            onPaste={(e) => e.preventDefault()}
            className="term-input border-b border-paper/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">type how many will receive it</span>
          <input
            value={typedCount}
            disabled={countdown !== null}
            onChange={(e) => setTypedCount(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="off"
            className="term-input border-b border-paper/20"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checkedPreview}
          disabled={countdown !== null}
          onChange={(e) => setCheckedPreview(e.target.checked)}
        />
        I&rsquo;ve read the preview of at least one participant&rsquo;s email, and the test that reached the team.
      </label>

      {error && <p role="alert" className="text-red-400">{error}</p>}

      {countdown === null ? (
        <button
          type="button"
          disabled={!armed}
          onClick={() => {
            setError(null);
            setCountdown(COUNTDOWN);
          }}
          className="self-start rounded border border-red-500/60 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/10 disabled:border-paper/10 disabled:text-dim disabled:hover:bg-transparent"
        >
          send to everyone ({count})
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-sm text-red-200">
            Sending to {count} participants in {countdown}s…
          </span>
          <button
            type="button"
            autoFocus
            onClick={() => setCountdown(null)}
            className="rounded border border-paper/40 px-3 py-1.5 text-sm text-paper hover:bg-paper/10"
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────

function RunProgress({
  progress,
  onStop,
  onDismiss,
}: {
  progress: Progress;
  onStop: () => void;
  onDismiss: () => void;
}) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2 rounded border border-paper/20 p-4 text-xs">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm">
          {progress.label}: {progress.sent} of {progress.total} sent
          {progress.failed.length > 0 && <span className="text-red-400"> · {progress.failed.length} failed</span>}
        </span>
        {progress.state === "running" ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded border border-red-500/60 px-3 py-1 text-red-200 hover:bg-red-500/10"
          >
            stop
          </button>
        ) : (
          <button type="button" onClick={onDismiss} className="text-dim hover:text-paper">
            dismiss
          </button>
        )}
      </div>
      <div className="h-1 w-full bg-paper/10">
        <div className="h-1 bg-paper/70" style={{ width: `${pct}%` }} />
      </div>
      {progress.current && <p className="text-dim">sending: {progress.current}</p>}
      {progress.state === "stopped" && <p className="text-amber-400/90">Stopped. Nothing more will go out from this send.</p>}
      {progress.state === "refused" && <p className="text-red-400">Stopped: {progress.message}</p>}
      {progress.state === "finished" && <p className="text-emerald-400/90">Finished.</p>}
      {progress.message && progress.state !== "refused" && <p className="text-dim">{progress.message}</p>}
      {progress.failed.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-red-300/80">
          {progress.failed.map((f, i) => (
            <li key={i}>
              {f.name}: {f.error}
            </li>
          ))}
        </ul>
      )}
      {progress.state === "running" && (
        <p className="text-[11px] text-dim">Keep this tab open and in view until it finishes.</p>
      )}
    </div>
  );
}
