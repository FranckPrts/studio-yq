import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publicProjectUrl } from "@/lib/app-url";
import { qrPng, qrSvg } from "@/lib/qr";

/**
 * The QR code for a project's participation link: `?format=svg` (default) for
 * the page and the board, `?format=png` for slides, `&download=1` to save it.
 *
 * Public, like the link it encodes, and served whether or not the project is
 * open — a tenant prints it before the event. Only a slug that was never a
 * project 404s, so this cannot be used to draw codes for arbitrary paths.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { slug: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const search = request.nextUrl.searchParams;
  const png = search.get("format") === "png";
  const url = publicProjectUrl(project.slug);

  const headers: Record<string, string> = {
    "Content-Type": png ? "image/png" : "image/svg+xml",
    // The link only changes with the slug or APP_BASE_URL; a few minutes of
    // caching spares a board reloading it, and a rename still shows up soon.
    "Cache-Control": "public, max-age=300",
  };
  if (search.get("download") === "1") {
    headers["Content-Disposition"] =
      `attachment; filename="${project.slug}-qr.${png ? "png" : "svg"}"`;
  }

  const body = png ? new Uint8Array(await qrPng(url)) : await qrSvg(url);
  return new NextResponse(body, { headers });
}
