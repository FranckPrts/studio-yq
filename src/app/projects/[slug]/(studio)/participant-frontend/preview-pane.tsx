"use client";

import { useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import type { PreviewScreen } from "@/app/projects/[slug]/preview-frame/protocol";
import PreviewFrame, { DEVICES, type Device, type FrameInfo } from "./frame";

export const SCREENS: { key: PreviewScreen; label: string }[] = [
  { key: "intro", label: "welcome" },
  { key: "questions", label: "questions" },
  { key: "tune", label: "tuning" },
  { key: "done", label: "saved" },
  { key: "closed", label: "closed" },
  { key: "notReady", label: "not ready" },
  { key: "board", label: "leaderboard" },
  { key: "boardEmpty", label: "leaderboard, empty" },
];

/** The screens a participant can actually reach with this copy and script. */
export function reachableScreens(introEnabled: boolean, hasQuestions: boolean) {
  return SCREENS.filter(
    ({ key }) =>
      (key !== "intro" || introEnabled) && (key !== "questions" || hasQuestions),
  );
}

export function DeviceSwitch({
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
 * One preview with a tab per screen, beside a form — the drafts it is handed
 * show before they are saved. `initialScreen` is where the page's subject is
 * most visible: tuning for the palette, the welcome for wording.
 */
export default function PreviewPane({
  slug,
  theme,
  lexicon,
  copy,
  initialScreen,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  initialScreen?: PreviewScreen;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [screen, setScreen] = useState<PreviewScreen>(
    initialScreen ?? (copy.introEnabled ? "intro" : "questions"),
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
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="text-xs text-dim">preview</h2>
        <DeviceSwitch device={device} onChange={setDevice} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {available.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setScreen(key)}
            className={
              shown === key
                ? "text-paper underline underline-offset-4"
                : "text-dim hover:text-paper"
            }
          >
            {label}
          </button>
        ))}
      </div>

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

      <p className="text-[11px] leading-relaxed text-dim">
        The participant page itself, with your unsaved changes and the latest
        script. Nothing here signs anyone in or saves an avatar. The background
        behind the avatar is drawn by the script, not by the palette. The
        leaderboard shows made-up runs; the real one opens from the overview.
      </p>
    </section>
  );
}
