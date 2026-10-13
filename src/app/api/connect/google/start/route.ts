import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireProjectRole } from "@/lib/auth/dal";
import { authorizeUrl, gmailConfigured } from "@/lib/report/gmail";

/**
 * Begins connecting a project's Gmail, for sending participant reports — the
 * same shape as the Supabase flow: `state` and a PKCE verifier in an httpOnly
 * cookie, the project slug beside them rather than in the redirect URI.
 */

export const dynamic = "force-dynamic";

const FLOW_COOKIE = "google_oauth_flow";
const FLOW_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("project");
  if (!slug) return NextResponse.json({ error: "Missing project" }, { status: 400 });

  // Which account a project's mail comes from is an owner's decision.
  await requireProjectRole(slug, "OWNER");
  if (!gmailConfigured()) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest().toString("base64url");

  (await cookies()).set(FLOW_COOKIE, JSON.stringify({ state, codeVerifier, slug }), {
    httpOnly: true,
    sameSite: "lax", // the callback is a cross-site navigation back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/connect/google",
    maxAge: FLOW_TTL_SECONDS,
  });

  return NextResponse.redirect(authorizeUrl(state, codeChallenge));
}
