"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { formatScore } from "@/lib/board";
import type { Parameter } from "@/lib/params/types";
import { layoutMap, MAP_ASPECT, nodesOf } from "@/lib/report/map-layout";
import {
  drawMap,
  nodeAt,
  resolveFontStack,
  softenSprite,
  type MapStyle,
} from "@/lib/report/map-render";
import { loadRoom, type Room, type RoomDatabase } from "@/lib/report/room";
import { CaptureStage, useCaptureQueue } from "../capture";

/**
 * The report map, as everyone's email will show it — with a search to see it
 * as any one participant will.
 *
 * Mini-avatars are photographed in the background and dropped onto the map as
 * they arrive; until then a node is a soft dot, so the layout can be judged
 * straight away.
 */

/** Drawing size. The email scales it down; the download keeps it. */
const MAP_HEIGHT = 1200;
const MAP_WIDTH = Math.round(MAP_HEIGHT * MAP_ASPECT);

type Person = { owner: string; names: string[] };

export default function MapView({
  slug,
  code,
  extensions,
  source,
  scriptKey,
  parameters,
  theme,
  noun,
  nounPlural,
  database,
}: {
  slug: string;
  code: string;
  extensions: { url: string }[];
  source: "mini" | "main";
  scriptKey: string;
  parameters: Parameter[];
  theme: { void: string; paper: string; dim: string; fontStack: string };
  noun: string;
  nounPlural: string;
  database: RoomDatabase;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sprites, setSprites] = useState<Map<string, CanvasImageSource>>(new Map());
  const [font, setFont] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Canvas text needs the face resolved and loaded, or the first draw falls
  // back to a default and the labels are measured for the wrong font.
  useEffect(() => {
    const stack = resolveFontStack(theme.fontStack);
    const size = Math.round(MAP_HEIGHT * 0.017);
    document.fonts
      .load(`${size}px ${stack}`)
      .catch(() => [])
      .then(() => setFont(stack));
  }, [theme.fontStack]);

  const layout = useMemo(() => (room ? layoutMap(room) : null), [room]);

  // Everyone, as people rather than avatars: one participant may own several,
  // and their report highlights all of them.
  const people = useMemo<Person[]>(() => {
    if (!room) return [];
    const byOwner = new Map<string, string[]>();
    for (const a of room.avatars) {
      byOwner.set(a.owner, [...(byOwner.get(a.owner) ?? []), a.name]);
    }
    return [...byOwner.entries()]
      .map(([owner, names]) => ({ owner, names }))
      .sort((x, y) => x.names[0].localeCompare(y.names[0]));
  }, [room]);

  const subjects = useMemo(() => room?.avatars ?? [], [room]);
  const queue = useCaptureQueue(subjects, scriptKey);

  // Turn finished pictures into drawable images, once each.
  useEffect(() => {
    let cancelled = false;
    const pending: Promise<[string, CanvasImageSource] | null>[] = [];
    for (const s of subjects) {
      const r = queue.resultOf(s);
      if (!r || !("image" in r) || sprites.has(s.id)) continue;
      pending.push(
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () =>
            resolve([s.id, source === "main" ? softenSprite(img) : img]);
          img.onerror = () => resolve(null);
          img.src = r.image;
        }),
      );
    }
    if (pending.length === 0) return;
    Promise.all(pending).then((loaded) => {
      if (cancelled) return;
      setSprites((prev) => {
        const next = new Map(prev);
        for (const entry of loaded) if (entry) next.set(entry[0], entry[1]);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [subjects, queue, sprites, source]);

  const style = useMemo<MapStyle | null>(
    () =>
      font
        ? { ground: theme.void, paper: theme.paper, dim: theme.dim, font }
        : null,
    [font, theme.void, theme.paper, theme.dim],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !layout || !style) return;
    drawMap(ctx, layout, {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      style,
      sprites,
      highlight,
    });
  }, [layout, style, sprites, highlight]);

  // ← / → step through everyone; Esc clears. Not while typing in the search.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape") return setHighlight(null);
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (people.length === 0) return;
      event.preventDefault();
      const at = people.findIndex((p) => p.owner === highlight);
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next =
        at < 0
          ? step > 0
            ? 0
            : people.length - 1
          : (at + step + people.length) % people.length;
      setHighlight(people[next].owner);
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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return people.filter((p) => p.names.some((n) => n.toLowerCase().includes(q))).slice(0, 8);
  }, [people, query]);

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
      <p role="alert" className="text-xs text-red-400">
        Couldn&rsquo;t read the room: {loadError}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 text-xs">
        <div className="relative flex w-full max-w-sm flex-col gap-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) {
                setHighlight(matches[0].owner);
                setQuery("");
              }
              if (e.key === "Escape") setQuery("");
            }}
            placeholder={`find a participant by ${noun} name`}
            className="term-input border-b border-paper/20"
            aria-label="Find a participant"
          />
          {matches.length > 0 && (
            <ul className="absolute top-full z-10 mt-1 w-full border border-paper/15 bg-void">
              {matches.map((p) => (
                <li key={p.owner}>
                  <button
                    type="button"
                    onClick={() => {
                      setHighlight(p.owner);
                      setQuery("");
                    }}
                    className="w-full truncate px-2 py-1 text-left hover:bg-paper/10"
                  >
                    {p.names.join(" · ")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
        className="h-auto w-full cursor-pointer border border-paper/10"
        style={{ background: theme.void, aspectRatio: `${MAP_ASPECT}` }}
      />

      {queue.current && (
        <figure className="flex items-center gap-3">
          <CaptureStage
            current={queue.current}
            run={queue.run}
            code={code}
            extensions={extensions}
            ground={theme.void}
            record={queue.record}
            className="h-24 w-24 shrink-0"
          />
          <figcaption className="text-[11px] text-dim">
            Photographing mini-avatars for the map: {queue.index + 1} of{" "}
            {queue.total}. Keep this tab in view — browsers pause drawing in
            hidden ones.
          </figcaption>
        </figure>
      )}
    </div>
  );
}
