import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handOverParticipant } from "@/lib/spoke/ops";

/**
 * A participant's browser lost its session with the tenant's Supabase and had
 * to sign in afresh. This hands what the old identity made to the new one, so
 * they carry on with their avatars instead of starting over.
 *
 * Called by participants, who have no account with us: the authority is the
 * two tokens — the new, live one in `Authorization`, and the old one in the
 * body, whose signature proves this browser held it. See `handOverParticipant`.
 * Allowed on a shut project too: it changes who may edit, not what anyone sees,
 * and returning readers of results need their avatars back just the same.
 */

export const dynamic = "force-dynamic";

/** A token is ~1KB; anything far larger is not one. */
const MAX_TOKEN = 8192;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const to = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let from: unknown;
  try {
    from = ((await request.json()) as { from?: unknown }).from;
  } catch {
    from = null;
  }
  if (
    !to ||
    typeof from !== "string" ||
    to.length > MAX_TOKEN ||
    from.length > MAX_TOKEN
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { slug },
    select: {
      id: true,
      connection: { select: { projectUrl: true, provisionedAt: true } },
    },
  });
  const projectUrl = project?.connection?.projectUrl;
  if (!project || !projectUrl || !project.connection?.provisionedAt) {
    return NextResponse.json({ error: "no such experience" }, { status: 404 });
  }

  const result = await handOverParticipant(project.id, projectUrl, from, to);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ moved: result.moved });
}
