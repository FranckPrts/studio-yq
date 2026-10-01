"use client";

import { useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import PreviewFrame, { type Device } from "../frame";
import { DeviceSwitch, reachableScreens } from "../preview-pane";

/**
 * Every screen a participant can reach, side by side, as saved. Each frame is
 * its own participant page fixed on one screen, so a change to the palette or
 * the wording can be checked everywhere it lands in one look.
 */
export default function AllScreens({
  slug,
  theme,
  lexicon,
  copy,
  hasQuestions,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  hasQuestions: boolean;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const screens = reachableScreens(copy.introEnabled, hasQuestions);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-[11px] text-dim">
          {screens.length} screens · the latest script · nothing here signs
          anyone in or saves an avatar
        </p>
        <DeviceSwitch device={device} onChange={setDevice} />
      </div>

      <div
        className={
          device === "phone"
            ? "grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4"
            : "grid gap-6 lg:grid-cols-2"
        }
      >
        {screens.map(({ key, label }) => (
          <figure key={key} className="flex min-w-0 flex-col gap-2">
            <figcaption className="text-xs text-dim">{label}</figcaption>
            <PreviewFrame
              slug={slug}
              theme={theme}
              lexicon={lexicon}
              copy={copy}
              screen={key}
              device={device}
              lazy
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
