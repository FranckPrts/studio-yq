"use client";

import { useEffect, useMemo, useState } from "react";
import type { Parameter } from "@/lib/params/types";
import { layoutMap, MAP_ASPECT, type MapLayout } from "@/lib/report/map-layout";
import { peopleOf, type Person } from "@/lib/report/people";
import { loadRoom, type Room, type RoomDatabase } from "@/lib/report/room";
import { CaptureStage, useCaptureQueue } from "./capture";
import { useCanvasFont, useSprites } from "./sprites";

/**
 * Everything a report page draws from, in one place: the room, its map layout,
 * its people, and their mini-avatars — photographed in the background and
 * loaded as images as they arrive.
 */

/** Map drawing size. The email shows it at a quarter; the download keeps it. */
export const MAP_HEIGHT = 1200;
export const MAP_WIDTH = Math.round(MAP_HEIGHT * MAP_ASPECT);
/** The map's label size, which the font has to be loaded at. */
export const MAP_FONT_PX = Math.round(MAP_HEIGHT * 0.017);

export type ReportScriptInfo = {
  code: string;
  extensions: { url: string }[];
  source: "mini" | "main";
  /** Identifies the script, so pictures taken with it can be reused. */
  key: string;
};

export function useReportRoom({
  database,
  parameters,
  script,
  fontStack,
}: {
  database: RoomDatabase;
  parameters: Parameter[];
  script: ReportScriptInfo;
  fontStack: string;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRoom(database, parameters).then(
      (r) => !cancelled && setRoom(r),
      (error: Error) => !cancelled && setLoadError(error.message),
    );
    return () => {
      cancelled = true;
    };
  }, [database, parameters]);

  const layout = useMemo<MapLayout | null>(() => (room ? layoutMap(room) : null), [room]);
  const people = useMemo<Person[]>(() => (room ? peopleOf(room) : []), [room]);
  const subjects = useMemo(() => room?.avatars ?? [], [room]);
  const queue = useCaptureQueue(subjects, script.key);
  const { sprites, raw } = useSprites(subjects, queue.resultOf, script.source);
  const font = useCanvasFont(fontStack, MAP_FONT_PX);

  return { room, loadError, layout, people, queue, sprites, raw, font };
}

/** The stage the queue photographs through, shown only while it works. */
export function CapturingNotice({
  queue,
  script,
  ground,
}: {
  queue: ReturnType<typeof useCaptureQueue>;
  script: ReportScriptInfo;
  ground: string;
}) {
  if (!queue.current) return null;
  return (
    <figure className="flex items-center gap-3">
      <CaptureStage
        current={queue.current}
        run={queue.run}
        code={script.code}
        extensions={script.extensions}
        ground={ground}
        record={queue.record}
        displayPx={96}
      />
      <figcaption className="text-[11px] text-dim">
        Photographing mini-avatars: {queue.index + 1} of {queue.total}. Keep this
        tab in view — browsers pause drawing in hidden ones.
      </figcaption>
    </figure>
  );
}

/** Find a participant by any of their avatars' names. */
export function PersonSearch({
  people,
  onPick,
  noun,
}: {
  people: Person[];
  onPick: (owner: string) => void;
  noun: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return people.filter((p) => p.names.some((n) => n.toLowerCase().includes(q))).slice(0, 8);
  }, [people, query]);

  function pick(owner: string) {
    onPick(owner);
    setQuery("");
  }

  return (
    <div className="relative flex w-full max-w-sm flex-col gap-1">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) pick(matches[0].owner);
          if (e.key === "Escape") setQuery("");
        }}
        placeholder={`find a participant by ${noun} name`}
        className="term-input rounded bg-surface px-2 py-1.5"
        aria-label="Find a participant"
      />
      {matches.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 w-full rounded bg-surface-hover">
          {matches.map((p) => (
            <li key={p.owner}>
              <button
                type="button"
                onClick={() => pick(p.owner)}
                className="w-full truncate px-2 py-1 text-left hover:bg-paper/10"
              >
                {p.names.join(" · ")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The next or previous person, wrapping; the first or last when none is picked. */
export function stepPerson(people: Person[], current: string | null, step: 1 | -1): string | null {
  if (people.length === 0) return null;
  const at = people.findIndex((p) => p.owner === current);
  const next =
    at < 0 ? (step > 0 ? 0 : people.length - 1) : (at + step + people.length) % people.length;
  return people[next].owner;
}
