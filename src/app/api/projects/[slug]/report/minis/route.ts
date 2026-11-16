import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { MINI_CAPTURE_PX } from "@/lib/report/mini";
import {
  currentScriptKey,
  decodeCapture,
  listCaptures,
  MAX_CAPTURE_BYTES,
} from "@/lib/report/mini-captures";

/**
 * Saved mini-avatar pictures for the current report script.
 *
 * GET lists them for anyone who can see the project. POST (one picture) and
 * DELETE (some or all) need a collaborator: these pictures go into emails to
 * participants, so someone who may only look must not be able to plant one.
 *
 * A route rather than a server action because a picture can come near a
 * server action's 1 MB body limit.
 */

export const dynamic = "force-dynamic";

const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId } = await requireProjectRole(slug, "VIEWER");
  const script = request.nextUrl.searchParams.get("script");
  if (!isId(script)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  return NextResponse.json({ captures: await listCaptures(projectId, slug, script) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");

  // Base64 is 4/3 of the picture, plus the JSON around it.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_CAPTURE_BYTES * 1.4 + 2_000) {
    return NextResponse.json({ error: "Too large." }, { status: 413 });
  }

  let body: { script?: unknown; avatarId?: unknown; paramsHash?: unknown; image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { script, avatarId, paramsHash, image } = body;
  if (!isId(script) || !isId(avatarId) || !isId(paramsHash) || typeof image !== "string") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  // Pictures of anything but the current script are not worth keeping.
  if (script !== (await currentScriptKey(projectId))) {
    return NextResponse.json({ error: "Not the current script." }, { status: 409 });
  }
  const decoded = decodeCapture(image);
  if (!decoded) return NextResponse.json({ error: "Not a picture." }, { status: 400 });

  const data = {
    paramsHash,
    px: MINI_CAPTURE_PX,
    mime: decoded.mime,
    image: decoded.bytes,
    takenById: user.id,
  };
  await db.miniCapture.upsert({
    where: { projectId_scriptKey_avatarId: { projectId, scriptKey: script, avatarId } },
    create: { projectId, scriptKey: script, avatarId, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}

/** `?script=…` clears that script's pictures; `&avatar=…` (repeatable) only those. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  const search = request.nextUrl.searchParams;
  const script = search.get("script");
  if (!isId(script)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const avatars = search.getAll("avatar").filter(isId);
  const { count } = await db.miniCapture.deleteMany({
    where: {
      projectId,
      scriptKey: script,
      ...(avatars.length > 0 ? { avatarId: { in: avatars } } : {}),
    },
  });
  return NextResponse.json({ deleted: count });
}
