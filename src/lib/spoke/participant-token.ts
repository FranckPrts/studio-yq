import "server-only";

/**
 * Checks that a participant token was really issued by a tenant's Supabase —
 * including one that has *expired*, which `auth.getUser` would refuse.
 *
 * That is the one thing it is for: a participant whose session lapsed proves
 * which identity they were with the last access token their browser held (see
 * `Kept` in browser-client). An expired token is still a genuine signature
 * over a `sub`, and only that browser ever had it.
 *
 * Verified against the project's published signing keys (JWKS). A project
 * still on the legacy shared JWT secret publishes none, so its tokens are
 * refused here — the participant then starts over, exactly as before.
 */

type Jwk = JsonWebKey & { kid?: string; alg?: string };

const JWKS_TTL_MS = 10 * 60 * 1000;
const jwksCache = new Map<string, { at: number; keys: Jwk[] }>();

async function signingKeys(projectUrl: string): Promise<Jwk[]> {
  const cached = jwksCache.get(projectUrl);
  if (cached && Date.now() - cached.at < JWKS_TTL_MS) return cached.keys;
  const response = await fetch(`${projectUrl}/auth/v1/.well-known/jwks.json`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(projectUrl, { at: Date.now(), keys });
  return keys;
}

function base64url(part: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(part, "base64url"));
}

function decodePart<T>(part: string): T | null {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

const ALGORITHMS: Record<
  string,
  { importAs: EcKeyImportParams | RsaHashedImportParams; verifyAs: EcdsaParams | AlgorithmIdentifier }
> = {
  ES256: {
    importAs: { name: "ECDSA", namedCurve: "P-256" },
    verifyAs: { name: "ECDSA", hash: "SHA-256" },
  },
  RS256: {
    importAs: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    verifyAs: { name: "RSASSA-PKCS1-v1_5" },
  },
};

export type ParticipantClaims = {
  sub: string;
  exp: number;
  role?: string;
  is_anonymous?: boolean;
  iss?: string;
};

/**
 * The token's claims if its signature holds and it came from this project's
 * auth; null otherwise. Expiry is deliberately *not* checked — the caller
 * decides how old is too old.
 */
export async function verifyParticipantToken(
  projectUrl: string,
  token: string,
): Promise<ParticipantClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodePart<{ alg?: string; kid?: string }>(headerPart);
  const algorithm = header?.alg ? ALGORITHMS[header.alg] : undefined;
  if (!header || !algorithm) return null;

  const keys = await signingKeys(projectUrl);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  let valid = false;
  try {
    // Only the key material: Node refuses an `alg` that disagrees with the
    // import parameters, and `kid` is ours, not WebCrypto's.
    const material: JsonWebKey = {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
      n: jwk.n,
      e: jwk.e,
    };
    const key = await crypto.subtle.importKey(
      "jwk",
      material,
      algorithm.importAs,
      false,
      ["verify"],
    );
    valid = await crypto.subtle.verify(
      algorithm.verifyAs,
      key,
      base64url(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  const claims = decodePart<ParticipantClaims>(payloadPart);
  if (!claims || typeof claims.sub !== "string" || typeof claims.exp !== "number") {
    return null;
  }
  if (claims.iss !== `${projectUrl}/auth/v1`) return null;
  return claims;
}
