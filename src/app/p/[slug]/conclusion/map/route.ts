import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * The map snapshot chosen for reports, for the conclusion page's {snapshot}
 * block. Public like the page — participants are not signed in — but only once
 * the conclusion is published; before then only the project's team (and
 * platform admins) can load it, for the studio preview.
 *
 * Only the chosen one is ever served here: other snapshots stay behind the
 * studio's sign-in. `?v=` carries the chosen snapshot's id, so choosing
 * another is a new URL and the old one may be cached freely.
 */

export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: {
      id: true,
      conclusionPublishedAt: true,
      reportSnapshot: { select: { image: true, mime: true } },
    },
  });
  if (!project?.reportSnapshot) return NOT_FOUND();

  const published = project.conclusionPublishedAt !== null;
  if (!published) {
    const user = await currentUser();
    const member =
      user &&
      (user.isPlatformAdmin ||
        (await db.membership.findFirst({
          where: { userId: user.id, projectId: project.id },
          select: { id: true },
        })));
    // As if there were nothing, so an unpublished map cannot be probed for.
    if (!member) return NOT_FOUND();
  }

  return new NextResponse(new Uint8Array(project.reportSnapshot.image), {
    headers: {
      "Content-Type": project.reportSnapshot.mime,
      // Public once published; before that, only for the browser that asked.
      "Cache-Control": published ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
