import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  cleanName,
  cleanNote,
  SUMMARY_SELECT,
  toSummary,
} from "@/lib/report/map-snapshots";

/**
 * One map snapshot. GET serves its picture (`?download=1` as a file); PATCH
 * renames it, edits its note, or makes it (or stops it being) the project's
 * report snapshot; DELETE removes it — and with it the report's, if chosen. The picture itself never
 * changes — a new look is a new snapshot, so the old one stays to compare.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; id: string }> };

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export async function GET(request: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const { projectId } = await requireProjectRole(slug, "VIEWER");
  const row = await db.mapSnapshot.findFirst({
    where: { id, projectId },
    select: { image: true, mime: true, name: true },
  });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": row.mime,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.nextUrl.searchParams.get("download")) {
    const base =
      `${slug}-${row.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "map";
    headers["Content-Disposition"] =
      `attachment; filename="${base}.${EXTENSION[row.mime] ?? "img"}"`;
  }
  return new NextResponse(new Uint8Array(row.image), { headers });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  let body: { name?: unknown; note?: unknown; inReports?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const data: { name?: string; note?: string } = {};
  if (body.name !== undefined) {
    const name = cleanName(body.name);
    if (!name) return NextResponse.json({ error: "A name can't be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.note !== undefined) {
    const note = cleanNote(body.note);
    if (note === null) {
      return NextResponse.json({ error: "That note is too long." }, { status: 400 });
    }
    data.note = note;
  }

  if (body.inReports !== undefined && typeof body.inReports !== "boolean") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { count } = await db.mapSnapshot.updateMany({ where: { id, projectId }, data });
  if (count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Choosing is on the project, so only a snapshot of this project — checked
  // just above — can be chosen; stopping clears it only if it is this one.
  if (body.inReports === true) {
    await db.project.update({ where: { id: projectId }, data: { reportSnapshotId: id } });
  } else if (body.inReports === false) {
    await db.project.updateMany({
      where: { id: projectId, reportSnapshotId: id },
      data: { reportSnapshotId: null },
    });
  }

  const [row, project] = await Promise.all([
    db.mapSnapshot.findUniqueOrThrow({ where: { id }, select: SUMMARY_SELECT }),
    db.project.findUniqueOrThrow({ where: { id: projectId }, select: { reportSnapshotId: true } }),
  ]);
  return NextResponse.json({ snapshot: toSummary(slug, row), chosenId: project.reportSnapshotId });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  const { count } = await db.mapSnapshot.deleteMany({ where: { id, projectId } });
  if (count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
