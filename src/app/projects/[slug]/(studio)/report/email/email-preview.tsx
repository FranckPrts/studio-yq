"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Parameter } from "@/lib/params/types";
import { buildReportImages } from "@/lib/report/email-images";
import {
  emailStyle,
  renderReportEmail,
  type EmailImage,
  type ImageBlock,
  type ReportEmail,
} from "@/lib/report/email-template";
import { emailValues } from "@/lib/report/email-values";
import { histogramStyle } from "@/lib/report/histogram-render";
import { statsOf, type Person, type PersonStats } from "@/lib/report/people";
import type { RoomDatabase } from "@/lib/report/room";
import type { FontKey } from "@/lib/theme/project-theme";
import {
  CapturingNotice,
  PersonSearch,
  stepPerson,
  useReportRoom,
  type ReportScriptInfo,
} from "../use-report-room";

type Theme = { void: string; paper: string; dim: string; font: FontKey; fontStack: string };

type Props = {
  draft: ReportEmail;
  projectName: string;
  theme: Theme;
  noun: string;
  nounPlural: string;
  answerKeys: string[];
  parameters: Parameter[];
  script: ReportScriptInfo | null;
  database: RoomDatabase | null;
};

/**
 * The email as one participant receives it. With a connected database and a
 * script, that is a real participant, pictures and all; without, a made-up one
 * so the wording can still be judged.
 */
export default function EmailPreview(props: Props) {
  return props.database && props.script ? (
    <LivePreview {...props} database={props.database} script={props.script} />
  ) : (
    <SamplePreview {...props} />
  );
}

/** A made-up participant, for a project with nobody to show yet. */
const SAMPLE_STATS: PersonStats = {
  runs: 3,
  partners: 2,
  best: 72.4,
  average: 58.1,
  percentile: 79,
  topStrategy: "we matched breathing first and let the movement follow",
};

function SamplePreview({ draft, projectName, theme, noun, nounPlural, answerKeys }: Props) {
  const person: Person = {
    owner: "sample",
    names: ["Tide Chorus"],
    avatars: [
      {
        id: "sample",
        owner: "sample",
        name: "Tide Chorus",
        params: {},
        answers: Object.fromEntries(answerKeys.map((k) => [k, "Tide Chorus"])),
        createdAt: "",
      },
    ],
  };
  const values = emailValues(person, SAMPLE_STATS, { project: projectName, noun, nounPlural, answerKeys });
  return (
    <Shown
      draft={draft}
      projectName={projectName}
      values={values}
      played
      images={{}}
      theme={theme}
      header={
        <p className="text-[11px] text-dim">
          A made-up participant. Connect the project&rsquo;s database to preview
          a real one, with their pictures.
        </p>
      }
    />
  );
}

function LivePreview({
  draft,
  projectName,
  theme,
  noun,
  nounPlural,
  answerKeys,
  parameters,
  script,
  database,
}: Props & { database: RoomDatabase; script: ReportScriptInfo }) {
  const { room, loadError, layout, people, queue, sprites, raw, font } = useReportRoom({
    database,
    parameters,
    script,
    fontStack: theme.fontStack,
  });
  const [picked, setPicked] = useState<string | null>(null);

  // Until someone is picked, the first person who played — the fuller email.
  const person = useMemo(() => {
    if (!room) return null;
    const chosen = people.find((p) => p.owner === picked);
    if (chosen) return chosen;
    const played = new Set(room.runs.flatMap((r) => [r.a, r.b]));
    return people.find((p) => p.avatars.some((a) => played.has(a.id))) ?? people[0] ?? null;
  }, [room, people, picked]);

  const stats = useMemo(() => (room && person ? statsOf(room, person) : null), [room, person]);

  // Pictures are redrawn when the person, the look or the photographs change —
  // never per keystroke. While photographs are still arriving, at most every
  // second or so.
  const [images, setImages] = useState<Partial<Record<ImageBlock, EmailImage>>>({});
  const capturing = !!queue.current;
  useEffect(() => {
    if (!room || !layout || !person || !stats || !font) return;
    const timer = window.setTimeout(
      () =>
        setImages(
          buildReportImages({
            room,
            layout,
            person,
            stats,
            map: {
              style: { ground: theme.void, paper: theme.paper, dim: theme.dim, font },
              sprites,
            },
            portraits: raw,
            ground: theme.void,
            histogram: histogramStyle(draft.look, theme, font),
          }),
        ),
      capturing ? 1200 : 50,
    );
    return () => window.clearTimeout(timer);
  }, [room, layout, person, stats, font, sprites, raw, draft.look, theme, capturing]);

  if (loadError) {
    return (
      <p role="alert" className="text-xs text-red-400">
        Couldn&rsquo;t read the room: {loadError}
      </p>
    );
  }
  if (!room) return <p className="text-xs text-dim">Reading the room…</p>;
  if (!person || !stats) {
    return (
      <p className="text-xs text-dim">
        Nobody has made a {noun} yet, so there is no one to preview.
      </p>
    );
  }

  const values = emailValues(person, stats, { project: projectName, noun, nounPlural, answerKeys });

  return (
    <Shown
      draft={draft}
      projectName={projectName}
      values={values}
      played={stats.runs > 0}
      images={images}
      theme={theme}
      header={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-xs">
            <PersonSearch people={people} onPick={setPicked} noun={noun} />
            <div className="flex items-baseline gap-3 text-dim">
              <button
                type="button"
                onClick={() => setPicked(stepPerson(people, person.owner, -1))}
                className="hover:text-paper"
                aria-label="Previous participant"
              >
                ←
              </button>
              <span className="text-paper">{person.names.join(" · ")}</span>
              <button
                type="button"
                onClick={() => setPicked(stepPerson(people, person.owner, 1))}
                className="hover:text-paper"
                aria-label="Next participant"
              >
                →
              </button>
            </div>
          </div>
          <CapturingNotice queue={queue} script={script} ground={theme.void} />
        </div>
      }
    />
  );
}

/** The rendered message: envelope lines, then the HTML or its plain-text half. */
function Shown({
  draft,
  projectName,
  values,
  played,
  images,
  theme,
  header,
}: {
  draft: ReportEmail;
  projectName: string;
  values: Record<string, string>;
  played: boolean;
  images: Partial<Record<ImageBlock, EmailImage>>;
  theme: Theme;
  header: ReactNode;
}) {
  const [view, setView] = useState<"html" | "text">("html");
  const rendered = useMemo(
    () => renderReportEmail(draft, values, played, images, emailStyle(draft.look, theme)),
    [draft, values, played, images, theme],
  );
  // Roughly what the pictures add to the message: base64 is 4/3 of the bytes.
  const kb = Math.round(
    rendered.images.reduce((sum, k) => sum + (images[k]?.src.length ?? 0) * 0.75, 0) / 1024,
  );

  return (
    <section className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
      {header}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-y border-paper/10 py-3 text-xs">
        <dt className="text-dim">from</dt>
        <dd>{draft.senderName || projectName}</dd>
        {draft.replyTo && (
          <>
            <dt className="text-dim">reply-to</dt>
            <dd>{draft.replyTo}</dd>
          </>
        )}
        <dt className="text-dim">subject</dt>
        <dd>{rendered.subject || <span className="text-dim">(empty)</span>}</dd>
      </dl>
      <div className="flex items-baseline justify-between text-xs">
        <div className="flex gap-4">
          {(["html", "text"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={view === v ? "text-paper underline underline-offset-4" : "text-dim hover:text-paper"}
            >
              {v === "html" ? "as most people see it" : "plain-text version"}
            </button>
          ))}
        </div>
        {kb > 0 && <span className="text-[11px] text-dim">pictures ≈ {kb} KB</span>}
      </div>
      {view === "html" ? (
        <iframe
          title="Email preview"
          srcDoc={rendered.html}
          // Nothing in the email runs scripts; the preview should not either.
          sandbox=""
          className="h-[75vh] w-full border border-paper/10 bg-white"
        />
      ) : (
        <pre className="h-[75vh] overflow-auto border border-paper/10 p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {rendered.text}
        </pre>
      )}
    </section>
  );
}
