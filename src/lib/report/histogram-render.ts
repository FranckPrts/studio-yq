import { buildBins, formatScore, scoreScale } from "@/lib/board";
import { ordinal } from "./people";

/**
 * The {histogram} picture: every run's score, with a dotted line where the
 * participant's best landed and their percentile beside it.
 *
 * A raster rather than the board's SVG, because most email clients drop SVG.
 * Same bins and axis as the board (`scoreScale` / `buildBins`), so the email
 * agrees with what the room saw. The "plain" look is the CCN recap's figure —
 * black bars on white, a red dotted mark, a serif — and "project" redraws it in
 * the project's palette.
 */

export type HistogramStyle = {
  paper: string;
  ink: string;
  mark: string;
  font: string;
};

export function histogramStyle(
  look: "plain" | "project",
  theme: { void: string; paper: string; dim: string },
  projectFont: string,
): HistogramStyle {
  return look === "project"
    ? { paper: theme.void, ink: theme.paper, mark: theme.paper, font: projectFont }
    : { paper: "#ffffff", ink: "#000000", mark: "#cc0000", font: "'Times New Roman', Times, serif" };
}

/** A tick step that gives about five labels on a count axis. */
function countStep(max: number): number {
  for (const step of [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500]) {
    if (max / step <= 6) return step;
  }
  return Math.ceil(max / 5);
}

export function drawHistogram(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scores: readonly number[],
  mark: number,
  percentile: number,
  style: HistogramStyle,
) {
  const u = height / 600; // designed at 1200 × 600
  const { min, max, binWidth, tickStep } = scoreScale(scores);
  const bins = buildBins(scores, min, max, binWidth);
  const top = Math.max(1, ...bins.map((b) => b.count));
  const yStep = countStep(top + 1);
  const yMax = Math.ceil((top + 1) / yStep) * yStep;

  // The plot area, as the recap's figure placed its axes.
  const L = width * 0.11;
  const R = width * 0.95;
  const T = height * 0.16;
  const B = height * 0.8;
  const xAt = (v: number) => L + ((v - min) / (max - min)) * (R - L);
  const yAt = (c: number) => B - (c / yMax) * (B - T);

  ctx.save();
  ctx.fillStyle = style.paper;
  ctx.fillRect(0, 0, width, height);

  // ---- bars, with a hairline gutter ----
  ctx.fillStyle = style.ink;
  ctx.globalAlpha = 0.88;
  const gutter = Math.max(1, 1.2 * u);
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const x0 = xAt(bin.start) + gutter / 2;
    const x1 = xAt(bin.end) - gutter / 2;
    ctx.fillRect(x0, yAt(bin.count), Math.max(1, x1 - x0), B - yAt(bin.count));
  }
  ctx.globalAlpha = 1;

  // ---- frame and ticks ----
  ctx.strokeStyle = style.ink;
  ctx.lineWidth = 1.6 * u;
  ctx.strokeRect(L, T, R - L, B - T);

  ctx.fillStyle = style.ink;
  ctx.font = `${Math.round(16 * u)}px ${style.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let v = min; v <= max + 1e-9; v += tickStep) {
    const x = xAt(v);
    ctx.beginPath();
    ctx.moveTo(x, B);
    ctx.lineTo(x, B + 8 * u);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), x, B + 12 * u);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let c = 0; c <= yMax; c += yStep) {
    const y = yAt(c);
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L - 8 * u, y);
    ctx.stroke();
    ctx.fillText(String(c), L - 12 * u, y);
  }

  // ---- axis labels and title ----
  ctx.font = `bold ${Math.round(18 * u)}px ${style.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("score", (L + R) / 2, B + 42 * u);
  ctx.save();
  ctx.translate(L - 62 * u, (T + B) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle";
  ctx.fillText("runs", 0, 0);
  ctx.restore();
  ctx.font = `${Math.round(20 * u)}px ${style.font}`;
  ctx.textBaseline = "bottom";
  ctx.fillText("Every run’s score", (L + R) / 2, T - 16 * u);

  // ---- their mark ----
  const mx = xAt(Math.min(max, Math.max(min, mark)));
  ctx.strokeStyle = style.mark;
  ctx.lineWidth = 1.8 * u;
  ctx.setLineDash([4 * u, 4 * u]);
  ctx.beginPath();
  ctx.moveTo(mx, T);
  ctx.lineTo(mx, B);
  ctx.stroke();
  ctx.setLineDash([]);

  // The label sits on whichever side has room, kept inside the frame, with a
  // short arrow back to the line.
  const label = `your best: ${formatScore(mark)} · ${ordinal(percentile)} percentile`;
  ctx.font = `bold ${Math.round(17 * u)}px ${style.font}`;
  const w = ctx.measureText(label).width;
  const side = mx > (L + R) / 2 ? -1 : 1;
  const half = w / 2 + 10 * u;
  const tx = Math.min(Math.max(mx + side * (half + 24 * u), L + half), R - half);
  const ty = T + (B - T) * 0.1;
  ctx.fillStyle = style.paper;
  ctx.fillRect(tx - half, ty - 14 * u, half * 2, 28 * u);
  ctx.fillStyle = style.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, tx, ty);
  const ax = tx - side * half;
  if (Math.abs(ax - mx) > 6 * u) {
    const ay = ty + 22 * u;
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 1.4 * u;
    ctx.beginPath();
    ctx.moveTo(ax, ty + 8 * u);
    ctx.lineTo(mx, ay);
    ctx.stroke();
  }

  ctx.restore();
}
