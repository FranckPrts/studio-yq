import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { pictureMime } from "@/lib/report/mini-captures";
import {
  cleanLook,
  cleanName,
  cleanNote,
  MAX_SNAPSHOT_BYTES,
  SUMMARY_SELECT,
  toSummary,
} from "@/lib/report/map-snapshots";

/**
 * The project's map snapshots. GET lists them, newest first, for anyone who
 * can see the project; POST takes one, for a collaborator.
 *
 * POST is a multipart form — the picture as a file, the rest as fields — so
 * the picture is sent as bytes, not a third bigger as base64.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId } = await requireProjectRole(slug, "VIEWER");
  const rows = await db.mapSnapshot.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: SUMMARY_SELECT,
  });
  return NextResponse.json({ snapshots: rows.map((r) => toSummary(slug, r)) });
}

const isShort = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 200;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_SNAPSHOT_BYTES + 50_000) {
    return NextResponse.json({ error: "That picture is too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const file = form.get("image");
  const name = cleanName(form.get("name"));
  const note = cleanNote(form.get("note") ?? "");
  const scriptKey = form.get("scriptKey");
  const highlight = form.get("highlight");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  let look: unknown;
  try {
    look = JSON.parse(String(form.get("look") ?? "null"));
  } catch {
    look = null;
  }

  if (!(file instanceof File) || file.size > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ error: "Bad picture." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
  if (note === null) return NextResponse.json({ error: "That note is too long." }, { status: 400 });
  if (!isShort(scriptKey) || !Number.isInteger(width) || !Number.isInteger(height)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (width < 1 || width > 8_000 || height < 1 || height > 8_000) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = pictureMime(bytes);
  if (!mime) return NextResponse.json({ error: "Not a picture." }, { status: 400 });

  const row = await db.mapSnapshot.create({
    data: {
      projectId,
      name,
      note,
      image: bytes,
      mime,
      width,
      height,
      look: cleanLook(look),
      scriptKey,
      highlight: isShort(highlight) ? highlight : null,
      createdById: user.id,
    },
    select: SUMMARY_SELECT,
  });
  return NextResponse.json({ snapshot: toSummary(slug, row) });
}
