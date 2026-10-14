"use client";

import { useEffect, useState } from "react";
import ParticipantExperience, {
  type ExperienceSample,
  type Step,
} from "@/app/p/[slug]/experience";
import Shut from "@/app/p/[slug]/shut";
import ResultsView from "@/app/p/[slug]/results/results-view";
import ConclusionView from "@/app/p/[slug]/conclusion/conclusion-view";
import { NavLink, type Nav } from "@/app/p/[slug]/nav";
import BoardView from "@/app/projects/[slug]/board/board-view";
import {
  buildOwnBoard,
  type BoardRow,
  type BoardRun,
  type BoardScore,
} from "@/lib/board";
import type { Parameter } from "@/lib/params/types";
import type { EmailQuestion } from "@/lib/projects/participant-details";
import {
  coerceLexicon,
  coerceTheme,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { coerceCopy, fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";
import {
  coerceConclusionPage,
  type ConclusionPage,
} from "@/lib/report/conclusion-template";
import type { FromPreview, PreviewScreen, ToPreview } from "./protocol";

const EXPERIENCE_STEPS: readonly PreviewScreen[] = [
  "intro",
  "questions",
  "tune",
  "done",
  "list",
  "results",
  "conclusion",
];

/**
 * Made-up runs, so the board can be judged before any real ones exist. Names
 * are deliberately unlike any noun a tenant would pick, and one row carries a
 * strategy note so that line's styling is visible too.
 */
const today = new Date().toISOString().slice(0, 10);
const SAMPLE_ROWS: BoardRow[] = [
  { id: "s1", rank: 1, score: 92.4, recordedAt: `${today}T14:52:00`, strategy: "we matched breathing first and let the movement follow", names: ["Tide Chorus", "Low Ember"] },
  { id: "s2", rank: 2, score: 87.1, recordedAt: `${today}T14:31:00`, strategy: null, names: ["Night Ferry", "Paper Moon"] },
  { id: "s3", rank: 3, score: 74.6, recordedAt: `${today}T14:10:00`, strategy: null, names: ["Quiet Static", "Salt Garden"] },
  { id: "s4", rank: 4, score: 61.0, recordedAt: `${today}T13:48:00`, strategy: null, names: ["Glass Orchard", ""] },
];

/**
 * The board's runs plus the ones that didn't place, so the histogram has a
 * shape. The latest lands mid-field, where the dotted line is easiest to judge.
 */
const SAMPLE_RUNS: BoardRun[] = [
  ...SAMPLE_ROWS.map((r) => ({ score: r.score, recordedAt: r.recordedAt })),
  ...[8, 14, 19, 22, 26, 29, 31, 33, 35, 37, 38, 40, 41, 43, 44, 46, 48, 50, 51, 53, 56, 58, 65, 69, 78].map(
    (score, i) => ({ score, recordedAt: `${today}T13:${String(i).padStart(2, "0")}:00` }),
  ),
  { score: 47.3, recordedAt: `${today}T14:58:00` },
];

/**
 * A returning participant's own: two avatars from the sample board, and the
 * runs they were in — the board's first and third rows, plus one that didn't
 * place, so the results show more than the board does.
 */
const SAMPLE_MINE: ExperienceSample = {
  avatars: [
    { id: "mine-1", name: "Tide Chorus" },
    { id: "mine-2", name: "Salt Garden" },
  ],
  runs: {
    scores: [
      { id: "s1", avatar_a_id: "mine-1", avatar_b_id: "other-1", score: 92.4, strategy: SAMPLE_ROWS[0].strategy, recorded_at: SAMPLE_ROWS[0].recordedAt },
      { id: "s3", avatar_a_id: "other-2", avatar_b_id: "mine-2", score: 74.6, strategy: null, recorded_at: SAMPLE_ROWS[2].recordedAt },
      { id: "r1", avatar_a_id: "mine-1", avatar_b_id: "other-3", score: 41.0, strategy: null, recorded_at: `${today}T13:22:00` },
    ],
    names: new Map([
      ["mine-1", "Tide Chorus"],
      ["mine-2", "Salt Garden"],
      ["other-1", "Low Ember"],
      ["other-2", "Quiet Static"],
      ["other-3", "Night Ferry"],
    ]),
  },
};

const SAMPLE_MINE_IDS = new Set(SAMPLE_MINE.avatars.map((a) => a.id));
const NO_AVATARS: ReadonlySet<string> = new Set();
const SAMPLE_RESULTS = buildOwnBoard(
  SAMPLE_MINE.runs.scores,
  SAMPLE_MINE.runs.names,
  SAMPLE_MINE_IDS,
);

/**
 * The whole experience as the conclusion reads it: the participant's runs, the
 * board's other two, and the histogram's filler, between a small named crowd
 * so "who did best" never shows a row of unnamed pairs.
 */
const CROWD = ["Iron Lantern", "Soft Signal", "Far Meadow", "Blue Hour", "Still Water", "Red Kite"];
const SAMPLE_ALL_SCORES: BoardScore[] = [
  ...SAMPLE_MINE.runs.scores,
  { id: "s2", avatar_a_id: "other-3", avatar_b_id: "other-4", score: 87.1, strategy: null, recorded_at: SAMPLE_ROWS[1].recordedAt },
  { id: "s4", avatar_a_id: "other-5", avatar_b_id: "other-6", score: 61.0, strategy: null, recorded_at: SAMPLE_ROWS[3].recordedAt },
  ...SAMPLE_RUNS.slice(SAMPLE_ROWS.length).map((run, i) => ({
    id: `c${i}`,
    avatar_a_id: `crowd-${i % CROWD.length}`,
    avatar_b_id: `crowd-${(i + 1) % CROWD.length}`,
    score: run.score,
    strategy: null,
    recorded_at: run.recordedAt,
  })),
];
const SAMPLE_ALL_NAMES = new Map([
  ...SAMPLE_MINE.runs.names,
  ["other-4", "Paper Moon"],
  ["other-5", "Glass Orchard"],
  ["other-6", ""],
  ...CROWD.map((name, i) => [`crowd-${i}`, name] as [string, string]),
]);

function toParent(message: FromPreview) {
  if (window.parent !== window) {
    window.parent.postMessage(message, window.location.origin);
  }
}

/**
 * Hosts the real participant page in preview mode and keeps it in step with the
 * editor's drafts. Drafts go through the same coercion as a save, so the preview
 * shows what saving would produce — defaults for blank fields included.
 */
export default function LivePreview({
  slug,
  projectName,
  theme: savedTheme,
  lexicon: savedLexicon,
  copy: savedCopy,
  conclusion: savedConclusion,
  conclusionOpen,
  email,
  script,
}: {
  /** The experience takes it for its links, though here they step in place. */
  slug: string;
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  conclusion: ConclusionPage;
  /**
   * Whether participants are shown links to the conclusion. Its own tab shows
   * it either way, so it can be checked before it is published.
   */
  conclusionOpen: boolean;
  /** As participants are asked it — null when they are not. */
  email: EmailQuestion | null;
  script: { code: string; version: number; parameters: Parameter[] } | null;
}) {
  const [theme, setTheme] = useState(savedTheme);
  const [lexicon, setLexicon] = useState(savedLexicon);
  const [copy, setCopy] = useState(savedCopy);
  const [conclusion, setConclusion] = useState(savedConclusion);
  const [played, setPlayed] = useState(true);

  const hasQuestions =
    !!script?.parameters.some((p) => p.type === "text") || !!email;
  const firstStep: Step = hasQuestions ? "questions" : "tune";
  const [screen, setScreen] = useState<PreviewScreen>(
    savedCopy.introEnabled ? "intro" : firstStep,
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      const data = event.data as ToPreview;
      if (data?.type === "yq-preview:draft") {
        setTheme(coerceTheme(data.theme));
        setLexicon(coerceLexicon(data.lexicon));
        setCopy(coerceCopy(data.copy));
        if (data.conclusion !== undefined) {
          setConclusion(coerceConclusionPage(data.conclusion));
        }
      } else if (data?.type === "yq-preview:reader") {
        setPlayed(data.played);
      } else if (data?.type === "yq-preview:show") {
        setScreen(data.screen);
      }
    }
    window.addEventListener("message", onMessage);
    // Announced after the listener is up, so the editor's first draft lands.
    toParent({ type: "yq-preview:ready", hasScript: !!script, hasQuestions });
    return () => window.removeEventListener("message", onMessage);
  }, [script, hasQuestions]);

  // A screen the current draft cannot reach falls through to the next one,
  // just as the participant's flow would skip it.
  let shown = screen;
  if (shown === "intro" && !copy.introEnabled) shown = firstStep;
  if (shown === "questions" && !hasQuestions) shown = "tune";

  const vars = {
    noun: lexicon.noun,
    nounPlural: lexicon.nounPlural,
    project: projectName,
  };

  function go(next: PreviewScreen) {
    setScreen(next);
    toParent({ type: "yq-preview:screen", screen: next });
  }
  // Results and the conclusion step in place here, never to the real pages.
  const nav: Nav = { onNavigate: (to) => go(to === "home" ? "list" : to) };

  const board = shown === "board" || shown === "boardEmpty";
  const conclusionShown = shown === "conclusion" || shown === "conclusionEmpty";
  const reading = shown === "results" || conclusionShown;
  const overlay =
    board || reading
      ? null
      : shown === "closed"
      ? fillCopy(copy.closedMessage, vars)
      : shown === "notReady"
        ? fillCopy(copy.notReadyMessage, vars)
        : shown === "conclusionPending"
          ? fillCopy(conclusion.pending, vars)
          : !script
            ? // Ours, not the tenant's: it only ever appears in this preview.
              `No valid script yet. Add one under parameters to see the ${lexicon.noun} here.`
            : null;

  return (
    <>
      {script && (
        <ParticipantExperience
          preview
          sample={SAMPLE_MINE}
          slug={slug}
          projectName={projectName}
          theme={theme}
          lexicon={lexicon}
          supabaseUrl=""
          publishableKey=""
          code={script.code}
          scriptVersion={script.version}
          parameters={script.parameters}
          copy={copy}
          conclusionOpen={conclusionOpen}
          email={email}
          step={
            EXPERIENCE_STEPS.includes(shown) ? (shown as Step) : undefined
          }
          onStepChange={go}
        />
      )}
      {/* Laid over the experience rather than replacing it, so flicking to the
          closed screen and back keeps the avatar and whatever was typed. */}
      {overlay !== null && (
        <div className="fixed inset-0 z-10 overflow-auto">
          <Shut theme={theme} title={projectName} message={overlay}>
            {shown === "closed" && conclusionOpen && (
              <NavLink
                nav={nav}
                to="conclusion"
                className="text-sm underline underline-offset-4"
              >
                {fillCopy(copy.conclusionButton, vars)}
              </NavLink>
            )}
          </Shut>
        </div>
      )}
      {shown === "results" && (
        <div className="fixed inset-0 z-10 overflow-auto">
          <ResultsView
            projectName={projectName}
            theme={theme}
            lexicon={lexicon}
            copy={copy}
            nav={nav}
            conclusionOpen={conclusionOpen}
            rows={SAMPLE_RESULTS}
          />
        </div>
      )}
      {conclusionShown && (
        <div className="fixed inset-0 z-10 overflow-auto">
          <ConclusionView
            projectName={projectName}
            theme={theme}
            lexicon={lexicon}
            copy={copy}
            conclusion={conclusion}
            nav={nav}
            scores={shown === "conclusion" ? SAMPLE_ALL_SCORES : []}
            names={SAMPLE_ALL_NAMES}
            mine={played ? SAMPLE_MINE_IDS : NO_AVATARS}
            hasAvatar={played}
          />
        </div>
      )}
      {board && (
        <div className="fixed inset-0 z-10 overflow-auto">
          <BoardView
            projectName={projectName}
            theme={theme}
            lexicon={lexicon}
            copy={copy}
            rows={shown === "board" ? SAMPLE_ROWS : []}
            runs={shown === "board" ? SAMPLE_RUNS : []}
          />
        </div>
      )}
    </>
  );
}
