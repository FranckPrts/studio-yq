"use client";

import { useEffect, useState } from "react";
import ParticipantExperience, { type Step } from "@/app/p/[slug]/experience";
import Shut from "@/app/p/[slug]/shut";
import BoardView from "@/app/projects/[slug]/board/board-view";
import type { BoardRow } from "@/lib/board";
import type { Parameter } from "@/lib/params/types";
import type { EmailQuestion } from "@/lib/projects/participant-details";
import {
  coerceLexicon,
  coerceTheme,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { coerceCopy, fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";
import type { FromPreview, PreviewScreen, ToPreview } from "./protocol";

const EXPERIENCE_STEPS: readonly PreviewScreen[] = [
  "intro",
  "questions",
  "tune",
  "done",
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
  projectName,
  theme: savedTheme,
  lexicon: savedLexicon,
  copy: savedCopy,
  email,
  script,
}: {
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  /** As participants are asked it — null when they are not. */
  email: EmailQuestion | null;
  script: { code: string; version: number; parameters: Parameter[] } | null;
}) {
  const [theme, setTheme] = useState(savedTheme);
  const [lexicon, setLexicon] = useState(savedLexicon);
  const [copy, setCopy] = useState(savedCopy);

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

  const board = shown === "board" || shown === "boardEmpty";
  const overlay =
    board
      ? null
      : shown === "closed"
      ? fillCopy(copy.closedMessage, vars)
      : shown === "notReady"
        ? fillCopy(copy.notReadyMessage, vars)
        : !script
          ? // Ours, not the tenant's: it only ever appears in this preview.
            `No valid script yet. Add one under parameters to see the ${lexicon.noun} here.`
          : null;

  return (
    <>
      {script && (
        <ParticipantExperience
          preview
          projectName={projectName}
          theme={theme}
          lexicon={lexicon}
          supabaseUrl=""
          publishableKey=""
          code={script.code}
          scriptVersion={script.version}
          parameters={script.parameters}
          copy={copy}
          email={email}
          step={
            EXPERIENCE_STEPS.includes(shown) ? (shown as Step) : undefined
          }
          onStepChange={(next) => {
            setScreen(next);
            toParent({ type: "yq-preview:screen", screen: next });
          }}
        />
      )}
      {/* Laid over the experience rather than replacing it, so flicking to the
          closed screen and back keeps the avatar and whatever was typed. */}
      {overlay !== null && (
        <div className="fixed inset-0 z-10 overflow-auto">
          <Shut theme={theme} title={projectName} message={overlay} />
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
          />
        </div>
      )}
    </>
  );
}
