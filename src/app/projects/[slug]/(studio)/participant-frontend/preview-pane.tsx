"use client";

import { useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import type { PreviewScreen } from "@/app/projects/[slug]/preview-frame/protocol";
import PreviewFrame, { DEVICES, type Device, type FrameInfo } from "./frame";

const SCREENS: { key: PreviewScreen; label: string }[] = [
  { key: "intro", label: "welcome" },
  { key: "questions", label: "questions" },
  { key: "tune", label: "tuning" },
  { key: "done", label: "saved" },
  { key: "closed", label: "closed" },
  { key: "notReady", label: "not ready" },
  { key: "board", label: "leaderboard" },
  { key: "boardEmpty", label: "leaderboard, empty" },
];

/** The screens a participant can actually reach with this wording and script. */
function reachableScreens(introEnabled: boolean, hasQuestions: boolean) {
  return SCREENS.filter(
    ({ key }) =>
      (key !== "intro" || introEnabled) && (key !== "questions" || hasQuestions),
  );
}

function DeviceSwitch({
  device,
  onChange,
}: {
  device: Device;
  onChange: (device: Device) => void;
}) {
  return (
    <div className="flex gap-3 text-[11px]">
      {(Object.keys(DEVICES) as Device[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={
            device === key
              ? "text-paper underline underline-offset-4"
              : "text-dim hover:text-paper"
          }
        >
          {key}
        </button>
      ))}
    </div>
  );
}

/**
 * The participant page as saved, one screen at a time: a tab per screen a
 * participant can reach with this wording and script, and a single frame below.
 * The editing pages save; this is where the result is looked at.
 */
export default function PreviewPane({
  slug,
  theme,
  lexicon,
  copy,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [screen, setScreen] = useState<PreviewScreen>(
    copy.introEnabled ? "intro" : "questions",
  );
  const [frame, setFrame] = useState<FrameInfo | null>(null);

  // Mirrors the preview's own fall-through, so the highlighted tab is the
  // screen actually on show.
  const hasQuestions = frame?.hasQuestions ?? false;
  let shown = screen;
  if (shown === "intro" && !copy.introEnabled) shown = hasQuestions ? "questions" : "tune";
  if (shown === "questions" && !hasQuestions) shown = "tune";
  const available = reachableScreens(copy.introEnabled, hasQuestions);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-paper/10">
        <div role="tablist" aria-label="Participant screens" className="flex flex-wrap gap-x-5">
          {available.map(({ key, label }) => {
            const active = shown === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScreen(key)}
                className={`-mb-px border-b pb-2 text-xs ${
                  active
                    ? "border-paper text-paper"
                    : "border-transparent text-dim hover:text-paper"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="pb-2">
          <DeviceSwitch device={device} onChange={setDevice} />
        </div>
      </div>

      <div role="tabpanel">
        <PreviewFrame
          slug={slug}
          theme={theme}
          lexicon={lexicon}
          copy={copy}
          screen={screen}
          device={device}
          onReady={setFrame}
          onScreen={setScreen}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-dim">
        The participant page itself, as saved, with the latest script — save on
        colours or text &amp; fonts to see a change here. Nothing here signs
        anyone in or saves an avatar. The background behind the avatar is drawn
        by the script, not by the palette. The leaderboard shows made-up runs;
        the real one opens from the overview.
      </p>
    </section>
  );
}
