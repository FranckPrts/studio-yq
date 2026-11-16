import "server-only";
import { db } from "@/lib/db";
import { MINI_CAPTURE_PX } from "./mini";
import { reportScript } from "./mini-script";

/**
 * Saved mini-avatar pictures — see the MiniCapture model. The browser takes
 * them; this decides what may be kept and hands them back.
 *
 * Only pictures of the project's current report script are accepted, so a tab
 * left open across an upload cannot save pictures of the old one, and a "try a
 * file" trial (keyed `trial:…`) never is.
 */

/** The key the report pages use for the current script, or null with none. */
export async function currentScriptKey(projectId: string): Promise<string | null> {
  const script = await reportScript(projectId);
  return script ? `${script.source}:${script.version}` : null;
}

/** A WebP of a busy 512px sketch is ~100 KB; PNG from Safari a few times that. */
export const MAX_CAPTURE_BYTES = 1_500_000;

const SIGNATURES: { mime: string; test: (b: Uint8Array) => boolean }[] = [
  {
    mime: "image/png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

/**
 * The picture format of some bytes, judged from the bytes rather than any
 * label: one of three, or null.
 */
export function pictureMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  return SIGNATURES.find((s) => s.test(bytes))?.mime ?? null;
}

/**
 * Reads a `data:image/…;base64,` URL into bytes, trusting the bytes rather than
 * the label: it must be one of three picture formats, whatever it claims.
 */
export function decodeCapture(
  dataUrl: string,
): { mime: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const match = /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const bytes = new Uint8Array(Buffer.from(match[1], "base64"));
  if (bytes.length > MAX_CAPTURE_BYTES) return null;
  const mime = pictureMime(bytes);
  return mime ? { mime, bytes } : null;
}

export type SavedCapture = {
  avatarId: string;
  paramsHash: string;
  /** Where the picture is served from; changes whenever it is replaced. */
  url: string;
};

/**
 * What is saved for the current script. Also clears out pictures of earlier
 * scripts and sizes, which nothing will ask for again.
 */
export async function listCaptures(
  projectId: string,
  slug: string,
  scriptKey: string,
): Promise<SavedCapture[]> {
  if (scriptKey !== (await currentScriptKey(projectId))) return [];

  await db.miniCapture.deleteMany({
    where: {
      projectId,
      OR: [{ scriptKey: { not: scriptKey } }, { px: { not: MINI_CAPTURE_PX } }],
    },
  });

  const rows = await db.miniCapture.findMany({
    where: { projectId, scriptKey, px: MINI_CAPTURE_PX },
    select: { id: true, avatarId: true, paramsHash: true, updatedAt: true },
  });
  return rows.map((r) => ({
    avatarId: r.avatarId,
    paramsHash: r.paramsHash,
    url: `/api/projects/${encodeURIComponent(slug)}/report/minis/${r.id}?v=${r.updatedAt.getTime()}`,
  }));
}
