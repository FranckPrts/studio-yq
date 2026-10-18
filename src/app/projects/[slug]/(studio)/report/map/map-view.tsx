"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { formatScore } from "@/lib/board";
import type { Parameter } from "@/lib/params/types";
import { MAP_ASPECT, nodesOf } from "@/lib/report/map-layout";
import { drawMap, nodeAt, type MapStyle } from "@/lib/report/map-render";
import type { RoomDatabase } from "@/lib/report/room";
import {
  CapturingNotice,
  MAP_HEIGHT,
  MAP_WIDTH,
  PersonSearch,
  stepPerson,
  useReportRoom,
  type ReportScriptInfo,
} from "../use-report-room";

/**
 * The report map, as everyone's email will show it — with a search to see it
 * as any one participant will.
 *
 * Mini-avatars are photographed in the background and dropped onto the map as
 * they arrive; until then a node is a soft dot, so the layout can be judged
 * straight away.
 */
export default function MapView({
  slug,
  script,
  parameters,
  theme,
  noun,
  nounPlural,
  database,
}: {
  slug: string;
  script: ReportScriptInfo;
  parameters: Parameter[];
  theme: { void: string; paper: string; dim: string; fontStack: string };
  noun: string;
  nounPlural: string;
  database: RoomDatabase;
}) {
  const { room, loadError, layout, people, queue, sprites, font } = useReportRoom({
    database,
    parameters,
    script,
    fontStack: theme.fontStack,
  });
  const [highlight, setHighlight] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const style = useMemo<MapStyle | null>(
    () => (font ? { ground: theme.void, paper: theme.paper, dim: theme.dim, font } : null),
    [font, theme.void, theme.paper, theme.dim],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !layout || !style) return;
    drawMap(ctx, layout, { width: MAP_WIDTH, height: MAP_HEIGHT, style, sprites, highlight });
  }, [layout, style, sprites, highlight]);

  // ← / → step through everyone; Esc clears. Not while typing in the search.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape") return setHighlight(null);
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      setHighlight(stepPerson(people, highlight, event.key === "ArrowRight" ? 1 : -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [people, highlight]);

  function onCanvasClick(event: MouseEvent<HTMLCanvasElement>) {
    if (!layout) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = MAP_WIDTH / rect.width;
    const i = nodeAt(
      layout,
      (event.clientX - rect.left) * scale,
      (event.clientY - rect.top) * scale,
      MAP_HEIGHT,
    );
    setHighlight(i < 0 ? null : layout.nodes[i].owner);
  }

  const selected = people.find((p) => p.owner === highlight) ?? null;
  const summary = useMemo(() => {
    if (!layout || !highlight) return null;
    const mine = new Set(nodesOf(layout, highlight));
    const edges = layout.edges.filter((e) => mine.has(e.a) || mine.has(e.b));
    const best = edges.reduce((m, e) => Math.max(m, e.score), -Infinity);
    return { pairs: edges.length, best: Number.isFinite(best) ? best : null };
  }, [layout, highlight]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const who = selected
        ? `-${selected.names[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
        : "";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-map${who}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  if (loadError) {
    return (
      <p role="alert" className="text-xs text-danger">
        Couldn&rsquo;t read the room: {loadError}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 text-xs">
        <PersonSearch people={people} onPick={setHighlight} noun={noun} />

        <div className="flex shrink-0 items-baseline gap-4">
          {highlight && (
            <button
              type="button"
              onClick={() => setHighlight(null)}
              className="text-dim underline-offset-4 hover:text-paper hover:underline"
            >
              clear
            </button>
          )}
          <button
            type="button"
            onClick={download}
            disabled={!layout}
            className="text-dim underline-offset-4 hover:text-paper hover:underline disabled:opacity-50"
          >
            download PNG
          </button>
        </div>
      </div>

      <p className="min-h-4 text-xs">
        {selected ? (
          <>
            <span className="text-paper">{selected.names.join(" · ")}</span>
            <span className="text-dim">
              {" "}
              — {summary?.pairs ?? 0} {summary?.pairs === 1 ? "partner" : "partners"}
              {summary?.best !== null && summary?.best !== undefined
                ? `, best ${formatScore(summary.best)}`
                : ", no runs yet"}
            </span>
          </>
        ) : (
          <span className="text-dim">
            {room
              ? `${people.length} participants · ${room.avatars.length} ${nounPlural} · ${layout?.edges.length ?? 0} pairings. Search, click a ${noun}, or use ← → to see the map as someone will.`
              : "Reading the room…"}
          </span>
        )}
      </p>

      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        onClick={onCanvasClick}
        className="h-auto w-full cursor-pointer rounded bg-surface"
        style={{ background: theme.void, aspectRatio: `${MAP_ASPECT}` }}
      />

      <CapturingNotice queue={queue} script={script} ground={theme.void} />
    </div>
  );
}
