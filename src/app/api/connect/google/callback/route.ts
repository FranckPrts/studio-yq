import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { safeEqual } from "@/lib/crypto/envelope";
import { connectGmail } from "@/lib/report/gmail";

export const dynamic = "force-dynamic";

const FLOW_COOKIE = "google_oauth_flow";

function back(slug: string | null, error?: string): NextResponse {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3100";
  const url = new URL(slug ? `/projects/${slug}/report/send` : "/projects", base);
  if (error) url.searchParams.set("gmail_error", error);
  else url.searchParams.set("gmail", "connected");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const raw = jar.get(FLOW_COOKIE)?.value;
  // Single-use, whatever happens next.
  jar.delete(FLOW_COOKIE);
  if (!raw) return back(null, "expired");

  let flow: { state: string; codeVerifier: string; slug: string };
  try {
    flow = JSON.parse(raw);
  } catch {
    return back(null, "expired");
  }

  const params = request.nextUrl.searchParams;
  const denied = params.get("error");
  if (denied) return back(flow.slug, denied);

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !safeEqual(state, flow.state)) return back(flow.slug, "state");

  // The cookie proves the flow, not that this person may still act on it.
  const { projectId, user } = await requireProjectRole(flow.slug, "COLLABORATOR");

  try {
    await connectGmail(projectId, user.id, code, flow.codeVerifier);
    return back(flow.slug);
  } catch (error) {
    console.error("[google oauth] connect failed:", error);
    return back(flow.slug, error instanceof Error ? error.message.slice(0, 160) : "exchange");
  }
}
