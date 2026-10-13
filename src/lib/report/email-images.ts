import type { EmailImage, ImageBlock } from "./email-template";
import { drawHistogram, type HistogramStyle } from "./histogram-render";
import type { MapLayout } from "./map-layout";
import { drawMap, type MapStyle } from "./map-render";
import { joinNames, type Person, type PersonStats } from "./people";
import type { Room } from "./room";

/**
 * The three pictures one participant's email can carry, drawn in the browser
 * and handed over as data URLs. Pixels are twice the size they are shown at,
 * for sharp screens.
 *
 * JPEG for the map and the portrait — gradients and glows on a solid ground,
 * which PNG makes heavy — and PNG for the histogram, whose flat bars and text
 * JPEG would smudge.
 */

/** Map pixels: twice the 600px the email shows it at. */
const MAP_OUT = { width: 1200, height: 800 };
/**
 * Labels at about 12px as the email shows them, rather than the map page's
 * size, which a 600px column would shrink to an unreadable 7px.
 */
const MAP_LABEL_SCALE = 1.8;

export type ReportImageInput = {
  room: Room;
  layout: MapLayout;
  person: Person;
  stats: PersonStats;
  /** The map's palette, font and mini-avatars, as the map page draws them. */
  map: { style: MapStyle; sprites: Map<string, CanvasImageSource> };
  /** Pictures as taken, by avatar id. */
  portraits: Map<string, CanvasImageSource>;
  ground: string;
  histogram: HistogramStyle;
};

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return [c, c.getContext("2d")!] as const;
}

export function buildReportImages(input: ReportImageInput): Partial<Record<ImageBlock, EmailImage>> {
  const out: Partial<Record<ImageBlock, EmailImage>> = {};
  const { person, stats } = input;

  // ---- portrait: their mini-avatars side by side, up to four ----
  const own = person.avatars
    .map((a) => input.portraits.get(a.id))
    .filter((p): p is CanvasImageSource => !!p)
    .slice(0, 4);
  if (own.length > 0) {
    const shown = own.length === 1 ? 300 : Math.min(240, Math.floor(600 / own.length));
    const cell = shown * 2;
    const [c, ctx] = canvas(cell * own.length, cell);
    ctx.fillStyle = input.ground;
    ctx.fillRect(0, 0, c.width, c.height);
    own.forEach((img, i) => ctx.drawImage(img, i * cell, 0, cell, cell));
    out.portrait = {
      src: c.toDataURL("image/jpeg", 0.9),
      width: shown * own.length,
      alt: joinNames(person.names),
    };
  }

  // ---- map, with them highlighted — drawn at email size, not scaled down,
  // so the labels can be sized for it ----
  {
    const [c, ctx] = canvas(MAP_OUT.width, MAP_OUT.height);
    drawMap(ctx, input.layout, {
      width: MAP_OUT.width,
      height: MAP_OUT.height,
      style: input.map.style,
      sprites: input.map.sprites,
      highlight: person.owner,
      labelScale: MAP_LABEL_SCALE,
    });
    out.map = {
      src: c.toDataURL("image/jpeg", 0.86),
      width: MAP_OUT.width / 2,
      alt: "The map of everyone who took part, with yours circled",
    };
  }

  // ---- histogram, for anyone with a score to mark ----
  if (stats.best !== null && stats.percentile !== null && input.room.runs.length > 0) {
    const [c, ctx] = canvas(1200, 600);
    drawHistogram(
      ctx,
      1200,
      600,
      input.room.runs.map((r) => r.score),
      stats.best,
      stats.percentile,
      input.histogram,
    );
    out.histogram = {
      src: c.toDataURL("image/png"),
      width: 600,
      alt: "Every run's score, with a line where your best landed",
    };
  }

  return out;
}
