import { formatScore } from "@/lib/board";
import type { MapLayout } from "./map-layout";
import { nodesOf } from "./map-layout";

/**
 * Drawing the report map onto a 2D canvas, in the project's own palette and
 * typeface. Plain canvas, no WebGL: it draws once per participant at send time,
 * and has to look the same on every machine that does it.
 *
 * The highlight: the person's own avatars ringed, a dashed
 * line and ring to everyone they played with, the score along each of those
 * links, and names under the rings — placed so that no two labels overlap.
 */

export type MapStyle = {
  ground: string;
  paper: string;
  dim: string;
  /** A resolved font-family list — canvas cannot read CSS variables. */
  font: string;
};

export type DrawOptions = {
  width: number;
  height: number;
  style: MapStyle;
  /** Mini-avatar pictures by avatar id. Missing ones draw as a soft dot. */
  sprites: Map<string, CanvasImageSource>;
  /** The participant (owner id) to highlight, or null for the plain map. */
  highlight: string | null;
};

/**
 * How much bigger a mini-avatar's picture is than the figure in it: a
 * mini-script draws centred with a margin, so the figure fills about 70%.
 */
const SPRITE_SCALE = 2.8;

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ring radius in pixels, for drawing and for hit-testing clicks. */
export function ringRadius(rad: number, height: number): number {
  return rad * height * 1.35 + height * 0.006;
}

export function drawMap(ctx: CanvasRenderingContext2D, layout: MapLayout, o: DrawOptions) {
  const { width, height, style, sprites } = o;
  const H = height; // layout units → pixels
  const px = (i: number) => [layout.nodes[i].x * H, layout.nodes[i].y * H] as const;

  const mine = o.highlight ? new Set(nodesOf(layout, o.highlight)) : new Set<number>();
  const focused = mine.size > 0;
  const myEdges = layout.edges.filter((e) => mine.has(e.a) || mine.has(e.b));
  const partners = new Set<number>();
  for (const e of myEdges) {
    if (!mine.has(e.a)) partners.add(e.a);
    if (!mine.has(e.b)) partners.add(e.b);
  }

  // ---- ground ------------------------------------------------------------
  ctx.save();
  ctx.fillStyle = style.ground;
  ctx.fillRect(0, 0, width, height);

  // ---- links -------------------------------------------------------------
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, H * 0.0018);
  for (const e of layout.edges) {
    const involved = mine.has(e.a) || mine.has(e.b);
    let alpha = lerp(0.14, 0.6, e.norm);
    if (focused && !involved) alpha *= 0.45;
    ctx.strokeStyle = withAlpha(style.paper, alpha);
    const [x0, y0] = px(e.a);
    const [x1, y1] = px(e.b);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // ---- nodes -------------------------------------------------------------
  layout.nodes.forEach((n, i) => {
    const [x, y] = px(i);
    const involved = mine.has(i) || partners.has(i);
    ctx.globalAlpha = n.bri * (focused && !involved ? 0.5 : 1);
    const sprite = sprites.get(n.id);
    if (sprite) {
      const size = n.rad * H * SPRITE_SCALE;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    } else {
      // Not photographed yet, or it failed: a soft dot in the text colour.
      const r = n.rad * H;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, withAlpha(style.paper, 0.9));
      g.addColorStop(1, withAlpha(style.paper, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  if (focused) drawHighlight(ctx, layout, o, mine, partners, myEdges);
  ctx.restore();
}

type Rect = { x: number; y: number; w: number; h: number };

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  layout: MapLayout,
  o: DrawOptions,
  mine: Set<number>,
  partners: Set<number>,
  myEdges: MapLayout["edges"],
) {
  const { width, height, style } = o;
  const H = height;
  const px = (i: number) => [layout.nodes[i].x * H, layout.nodes[i].y * H] as const;
  const ring = (i: number) => ringRadius(layout.nodes[i].rad, H);
  const fontPx = Math.round(H * 0.017);
  ctx.font = `${fontPx}px ${style.font}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // ---- layout: names first, then score labels in the first free spot ----
  const taken: Rect[] = [];
  const collides = (r: Rect) =>
    taken.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
  const inside = (r: Rect) => r.x > 2 && r.y > 2 && r.x + r.w < width - 2 && r.y + r.h < height - 2;

  const names: { label: string; x: number; y: number; main: boolean }[] = [];
  const reserveName = (i: number, main: boolean) => {
    const [x, y] = px(i);
    const label = layout.nodes[i].name;
    const w = ctx.measureText(label).width + 8;
    const h = fontPx * 1.5;
    const ty = y + ring(i) + fontPx * 0.9;
    // Kept on the canvas: a name under a node near the edge would run off it.
    const tx = Math.min(Math.max(x, w / 2 + 2), width - w / 2 - 2);
    taken.push({ x: tx - w / 2, y: ty - h / 2, w, h });
    names.push({ label, x: tx, y: ty, main });
  };
  for (const i of mine) reserveName(i, true);
  for (const i of partners) reserveName(i, false);

  const chips: { label: string; x: number; y: number; w: number; h: number }[] = [];
  for (const e of myEdges) {
    const [x0, y0] = px(e.a);
    const [x1, y1] = px(e.b);
    const label = formatScore(e.score);
    const w = ctx.measureText(label).width + fontPx;
    const h = fontPx * 1.7;
    const len = Math.max(Math.hypot(x1 - x0, y1 - y0), 0.001);
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    const step = h * 0.85;

    // Slide along the link and away from it until the label fits.
    let at = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    search: for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      for (const k of [0, 1, -1, 2, -2]) {
        const cx = x0 + (x1 - x0) * t + nx * step * k;
        const cy = y0 + (y1 - y0) * t + ny * step * k;
        const r = { x: cx - w / 2, y: cy - h / 2, w, h };
        if (!collides(r) && inside(r)) {
          at = { x: cx, y: cy };
          break search;
        }
      }
    }
    taken.push({ x: at.x - w / 2, y: at.y - h / 2, w, h });
    chips.push({ label, x: at.x, y: at.y, w, h });
  }

  // ---- draw --------------------------------------------------------------
  const dash = [H * 0.005, H * 0.006];
  ctx.lineWidth = Math.max(1, H * 0.0014);
  for (const e of myEdges) {
    const [x0, y0] = px(e.a);
    const [x1, y1] = px(e.b);
    ctx.setLineDash(dash);
    ctx.strokeStyle = withAlpha(style.paper, 0.55);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  for (const i of partners) {
    const [x, y] = px(i);
    ctx.setLineDash(dash);
    ctx.strokeStyle = withAlpha(style.paper, 0.7);
    ctx.beginPath();
    ctx.arc(x, y, ring(i), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1.5, H * 0.0022);
  ctx.strokeStyle = style.paper;
  for (const i of mine) {
    const [x, y] = px(i);
    ctx.beginPath();
    ctx.arc(x, y, ring(i), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const c of chips) {
    ctx.fillStyle = withAlpha(style.ground, 0.82);
    ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    ctx.fillStyle = style.paper;
    ctx.fillText(c.label, c.x, c.y);
  }
  for (const n of names) {
    ctx.fillStyle = n.main ? style.paper : style.dim;
    ctx.fillText(n.label, n.x, n.y);
  }
}

/** The node under a point in canvas pixels, or -1. */
export function nodeAt(layout: MapLayout, x: number, y: number, height: number): number {
  let found = -1;
  let nearest = Infinity;
  layout.nodes.forEach((n, i) => {
    const d = Math.hypot(x - n.x * height, y - n.y * height);
    if (d < nearest) {
      nearest = d;
      found = i;
    }
  });
  if (found < 0) return -1;
  const reach = Math.max(ringRadius(layout.nodes[found].rad, height), height * 0.02);
  return nearest <= reach ? found : -1;
}

/**
 * A main script's picture has its own background, which would sit on the map
 * as a hard-edged square. Fading it to a soft disc keeps a map of them legible;
 * a proper mini-script draws on transparency and is left alone.
 */
export function softenSprite(image: HTMLImageElement): HTMLCanvasElement {
  const size = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, (size - image.naturalWidth) / 2, (size - image.naturalHeight) / 2);
  ctx.globalCompositeOperation = "destination-in";
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0.55, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * A font-family list with its CSS variables resolved, which is what canvas
 * needs: `var(--font-dm-mono)` means nothing to `ctx.font`.
 */
export function resolveFontStack(stack: string): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = stack;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).fontFamily;
  probe.remove();
  return resolved || "monospace";
}
