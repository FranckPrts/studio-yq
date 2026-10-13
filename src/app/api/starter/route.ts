import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/dal";
import {
  STARTER_FILES,
  starterBundle,
  starterFile,
  zipFiles,
  type StarterFile,
} from "@/lib/visuals/bundle";

/**
 * Downloads the starter visual.
 *
 * Default is the whole bundle as a zip, because a sketch and its declaration
 * only make sense together. `?file=sketch|parameters|readme|mini` fetches one
 * piece for anyone who wants just that.
 *
 * Signed-in only: nothing here is secret, but an unauthenticated endpoint is a
 * thing to maintain and defend, and nobody needs this who is not already in.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireUser();

  const which = request.nextUrl.searchParams.get("file");

  if (which) {
    if (!Object.hasOwn(STARTER_FILES, which)) {
      return NextResponse.json(
        { error: "file must be 'sketch', 'parameters', 'readme' or 'mini'" },
        { status: 400 },
      );
    }
    const body = await starterFile(which as StarterFile);
    const name = STARTER_FILES[which as StarterFile];

    return new NextResponse(body, {
      headers: {
        // text/plain, not the real type: a browser that renders JavaScript or
        // JSON inline instead of saving makes for a confusing download, and the
        // filename carries the real extension anyway.
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const zip = zipFiles(await starterBundle());
  return new NextResponse(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="starter-visual.zip"',
      "Content-Length": String(zip.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
