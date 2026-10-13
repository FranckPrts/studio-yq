import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";

/**
 * Downloads a project's mini-script — the active one, or `?version=N`.
 *
 * A single .js rather than a zip like the main script: there is no declaration
 * to keep it company, since it reads the main script's.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId } = await requireProjectRole(slug, "VIEWER");

  const requested = request.nextUrl.searchParams.get("version");
  const version = requested ? Number(requested) : null;
  if (requested && !Number.isInteger(version)) {
    return NextResponse.json({ error: "bad version" }, { status: 400 });
  }

  const script = await db.miniScript.findFirst({
    where: version ? { projectId, version } : { projectId },
    orderBy: version ? undefined : { version: "desc" },
    select: { version: true, code: true },
  });
  // A null-code version is a switch back to the main script: nothing to give.
  if (!script?.code) {
    return NextResponse.json({ error: "no such mini-script" }, { status: 404 });
  }

  return new NextResponse(script.code, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-mini-v${script.version}.js"`,
      "Cache-Control": "no-store",
    },
  });
}
