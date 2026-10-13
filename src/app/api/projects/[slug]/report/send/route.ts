import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { deliver, SendRefused, type DeliveryRequest } from "@/lib/report/sending";

/**
 * Sends one email of a run. The browser posts the participant's values and
 * pictures; everything else — whether this recipient is in the run, their
 * address, the text — is decided in `deliver`.
 *
 * A route rather than a server action because the pictures make the body a few
 * hundred kilobytes, past a server action's default 1 MB limit with room to
 * spare for nothing.
 */

export const dynamic = "force-dynamic";

/** Three pictures at most, each well under 3 MB. */
const MAX_BODY_BYTES = 4_000_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { projectId, role } = await requireProjectRole(slug, "COLLABORATOR");

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Too large." }, { status: 413 });
  }

  let body: DeliveryRequest;
  try {
    body = (await request.json()) as DeliveryRequest;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof body?.runId !== "string" || typeof body.recipientKey !== "string") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    return NextResponse.json(await deliver({ projectId, role }, body));
  } catch (error) {
    if (error instanceof SendRefused) {
      return NextResponse.json({ error: error.message, refused: true }, { status: 409 });
    }
    console.error("[report send] failed:", error);
    return NextResponse.json({ error: "Sending failed." }, { status: 500 });
  }
}
