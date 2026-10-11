"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { buildBins, scoreScale } from "@/lib/board";

/** Axis type, as the CCN plate set it: a step below the board's smallest. */
const AXIS_TYPE = { fontSize: "calc(0.875rem - 4pt)" } as const;

/**
 * Every run's score on the void: the CCN conclusion plate, moved under the
 * leaderboard so the room watches the distribution fill in as the event goes.
 *
 * Drawn only with the `paper` / `dim` utilities the rest of the board uses, so
 * a project's palette reaches it through the variables `BoardView` sets, with
 * no colour of its own; the type inherits the project's face. Hover a bin for
 * its range and count; a dotted line marks the latest run.
 */
export default function ScoreHistogram({
  scores,
  latest,
}: {
  scores: readonly number[];
  /** The latest run's score, marked with a dotted line. */
  latest?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  const { min, max, binWidth, tickStep } = useMemo(
    () => scoreScale(scores),
    [scores],
  );
  const bins = useMemo(
    () => buildBins(scores, min, max, binWidth),
    [scores, min, max, binWidth],
  );
  const peak = Math.max(1, ...bins.map((b) => b.count));

  // Flatter than the CCN plate's 420 × 240: it stays pinned under the board,
  // so it must leave the rows most of the screen.
  const width = 420;
  const height = 150;
  const padLeft = 48;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const gap = 1;
  const barW = plotW / bins.length;

  const xFor = (score: number) =>
    padLeft + ((Math.min(max, Math.max(min, score)) - min) / (max - min)) * plotW;

  const tickScores = Array.from(
    { length: Math.floor((max - min) / tickStep) + 1 },
    (_, i) => min + i * tickStep,
  );

  function track(e: MouseEvent<SVGRectElement>, i: number, label: string) {
    setHoverIdx(i);
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label });
  }

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Score histogram of every run so far"
        onMouseLeave={() => {
          setHoverIdx(null);
          setTooltip(null);
        }}
      >
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padLeft}
            y1={padTop + plotH * (1 - frac)}
            x2={padLeft + plotW}
            y2={padTop + plotH * (1 - frac)}
            className="stroke-dim"
            strokeWidth={0.6}
            opacity={0.45}
          />
        ))}

        {bins.map((bin, i) => {
          const barH = (bin.count / peak) * plotH;
          const x =
            padLeft + ((bin.start - min) / (max - min)) * plotW + gap / 2;
          const y = padTop + plotH - barH;
          const w = Math.max(0, barW - gap);
          const label = `${bin.start}–${bin.end}: ${bin.count}`;

          return (
            <g key={`${bin.start}-${bin.end}`}>
              <rect
                x={x}
                y={padTop}
                width={w}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={(e) => track(e, i, label)}
                onMouseMove={(e) => track(e, i, label)}
              />
              <rect
                x={x}
                y={y}
                width={w}
                height={barH}
                className="fill-paper"
                opacity={hoverIdx === i ? 1 : 0.85}
                style={{
                  transition: "opacity 80ms linear, height 400ms ease, y 400ms ease",
                  pointerEvents: "none",
                }}
              />
            </g>
          );
        })}

        {/* Dim rather than the plate's old red: the board is drawn in the
            project's three colours, and dim reads over paper bars and void. */}
        {latest !== undefined && Number.isFinite(latest) && (
          <line
            x1={xFor(latest)}
            y1={padTop}
            x2={xFor(latest)}
            y2={padTop + plotH}
            className="stroke-dim"
            strokeWidth={1.25}
            strokeDasharray="2.5 2.5"
            style={{ pointerEvents: "none" }}
          />
        )}

        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={padTop + plotH}
          className="stroke-paper"
          strokeWidth={1}
        />
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={padLeft + plotW}
          y2={padTop + plotH}
          className="stroke-paper"
          strokeWidth={1}
        />

        {tickScores.map((t) => (
          <g key={t}>
            <line
              x1={xFor(t)}
              y1={padTop + plotH}
              x2={xFor(t)}
              y2={padTop + plotH + 4}
              className="stroke-paper"
              strokeWidth={0.8}
            />
            <text
              x={xFor(t)}
              y={padTop + plotH + 18}
              textAnchor="middle"
              className="fill-paper tabular-nums"
              style={AXIS_TYPE}
            >
              {t}
            </text>
          </g>
        ))}

        <text
          x={14}
          y={padTop + plotH / 2}
          textAnchor="middle"
          className="fill-paper"
          transform={`rotate(-90 14 ${padTop + plotH / 2})`}
          style={AXIS_TYPE}
        >
          Frequency
        </text>
        <text
          x={padLeft + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-paper"
          style={AXIS_TYPE}
        >
          Score
        </text>

        <text
          x={padLeft - 8}
          y={padTop + 6}
          textAnchor="end"
          className="fill-paper tabular-nums"
          style={AXIS_TYPE}
        >
          {peak}
        </text>
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap border border-paper/40 bg-void px-2 py-1 tabular-nums text-paper"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(10px, -120%)",
            ...AXIS_TYPE,
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
