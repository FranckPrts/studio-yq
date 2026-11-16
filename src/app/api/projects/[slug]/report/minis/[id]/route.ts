import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * One saved mini-avatar picture. Its URL carries `?v=` the time it was saved,
 * so the browser may keep it for good: a replaced picture is a new URL.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const { projectId } = await requireProjectRole(slug, "VIEWER");
  const row = await db.miniCapture.findFirst({
    where: { id, projectId },
    select: { image: true, mime: true },
  });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
