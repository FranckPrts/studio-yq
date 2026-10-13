import "server-only";
import { db } from "@/lib/db";
import {
  aadFor,
  CURRENT_KEY_VERSION,
  decryptSecret,
  encryptSecret,
  UnreadableSecretError,
} from "@/lib/crypto/envelope";

/**
 * Sending from a project's own Gmail account, over the Gmail API.
 *
 * Only `gmail.send` is asked for — the narrowest scope that can send, and one
 * Google classes as *sensitive* rather than *restricted*, so the app can be
 * verified without a paid security assessment. It cannot read the mailbox.
 * That rules out SMTP, which needs full mail access; the API takes the same
 * message as one HTTPS call.
 *
 * The refresh token is sealed with the envelope key like a Supabase secret.
 * Access tokens are short-lived and only ever held in memory.
 */

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const REVOKE = "https://oauth2.googleapis.com/revoke";
const SEND = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const SCOPES = ["openid", "email", GMAIL_SEND_SCOPE];

/** Said to the owner whenever the grant stops working. */
export const GMAIL_RECONNECT =
  "The Gmail connection needs renewing — an owner can reconnect it on the send page.";

export function gmailConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

function config() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured — see GOOGLE_OAUTH_* in .env.example");
  }
  return { clientId, clientSecret, redirectUri };
}

export function authorizeUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri } = config();
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    // A refresh token, and asked for every time: Google only returns one on
    // the first consent unless prompted again.
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  id_token?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = String(json.error ?? res.status);
    throw Object.assign(new Error(`Google token request failed: ${error}`), { oauthError: error });
  }
  return json as unknown as TokenResponse;
}

/**
 * The account an id_token names. Read without checking its signature, which
 * OpenID Connect allows for a token received straight from Google's token
 * endpoint over TLS — nobody else could have put it there.
 */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return payload.email_verified !== false && typeof payload.email === "string"
      ? payload.email
      : null;
  } catch {
    return null;
  }
}

/** Exchanges the code and stores the grant. Throws a sentence for the owner. */
export async function connectGmail(
  projectId: string,
  userId: string,
  code: string,
  codeVerifier: string,
): Promise<void> {
  const { clientId, clientSecret, redirectUri } = config();
  const tokens = await tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const granted = tokens.scope.split(" ");
  if (!granted.includes(GMAIL_SEND_SCOPE)) {
    throw new Error("Permission to send email was not granted — tick it on Google's screen.");
  }
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token. Try again.");
  const googleEmail = emailFromIdToken(tokens.id_token);
  if (!googleEmail) throw new Error("Google did not say which account this is. Try again.");

  // Upserted with a known id, because the token's encryption is bound to it.
  const existing = await db.gmailConnection.findUnique({
    where: { projectId },
    select: { id: true, refreshTokenEnc: true, keyVersion: true },
  });
  if (existing) await revokeQuietly(existing);

  const id = existing?.id ?? crypto.randomUUID();
  const data = {
    googleEmail,
    refreshTokenEnc: encryptSecret(tokens.refresh_token, aadFor(id, "gmailRefreshToken")),
    keyVersion: CURRENT_KEY_VERSION,
    scope: tokens.scope,
    connectedById: userId,
  };
  await db.gmailConnection.upsert({
    where: { projectId },
    create: { id, projectId, ...data },
    update: data,
  });
  accessTokens.delete(projectId);
}

async function revokeQuietly(row: { id: string; refreshTokenEnc: string; keyVersion: number }) {
  try {
    const token = decryptSecret(row.refreshTokenEnc, aadFor(row.id, "gmailRefreshToken"), row.keyVersion);
    await fetch(`${REVOKE}?token=${encodeURIComponent(token)}`, { method: "POST" });
  } catch {
    // Already unreadable or already revoked: either way, nothing left to undo.
  }
}

/** Revokes the grant at Google and forgets it here. */
export async function disconnectGmail(projectId: string): Promise<void> {
  const row = await db.gmailConnection.findUnique({ where: { projectId } });
  if (!row) return;
  await revokeQuietly(row);
  await db.gmailConnection.delete({ where: { projectId } });
  accessTokens.delete(projectId);
}

/** Access tokens in memory only, a minute short of Google's expiry. */
const accessTokens = new Map<string, { token: string; until: number }>();

async function accessToken(projectId: string): Promise<{ token: string; from: string }> {
  const row = await db.gmailConnection.findUnique({ where: { projectId } });
  if (!row) throw new Error("No Gmail account is connected to this project.");

  const cached = accessTokens.get(projectId);
  if (cached && cached.until > Date.now()) return { token: cached.token, from: row.googleEmail };

  let refresh: string;
  try {
    refresh = decryptSecret(row.refreshTokenEnc, aadFor(row.id, "gmailRefreshToken"), row.keyVersion);
  } catch (error) {
    if (error instanceof UnreadableSecretError) throw new Error(GMAIL_RECONNECT);
    throw error;
  }

  const { clientId, clientSecret } = config();
  try {
    const tokens = await tokenRequest({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    });
    accessTokens.set(projectId, {
      token: tokens.access_token,
      until: Date.now() + (tokens.expires_in - 60) * 1000,
    });
    return { token: tokens.access_token, from: row.googleEmail };
  } catch (error) {
    // invalid_grant: revoked, expired (7 days for an app in Testing), or the
    // password changed. Only reconnecting fixes it.
    if ((error as { oauthError?: string }).oauthError === "invalid_grant") {
      throw new Error(GMAIL_RECONNECT);
    }
    throw error;
  }
}

/** The address mail goes out as — needed to write the From line. */
export async function sendingAccount(projectId: string): Promise<string> {
  return (await accessToken(projectId)).from;
}

/** Sends one RFC 5322 message; returns Gmail's id for it. */
export async function sendRaw(projectId: string, mime: string): Promise<string> {
  const { token } = await accessToken(projectId);
  const res = await fetch(SEND, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (res.status === 401) {
    accessTokens.delete(projectId);
    throw new Error(GMAIL_RECONNECT);
  }
  if (!res.ok || !json.id) {
    throw new Error(`Gmail refused the message: ${json.error?.message ?? res.status}`);
  }
  return json.id;
}
