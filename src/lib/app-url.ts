/**
 * Where this app lives, for every absolute URL it hands out: participant and
 * conclusion links, the QR code that encodes them, invitations, OAuth
 * redirects.
 *
 * Always `APP_BASE_URL`, never the request's host: the console may be open on
 * localhost or a preview deployment, and a link copied or a QR printed there
 * must still lead participants to production.
 */

const LOCAL = "http://localhost:3100";

let warned = false;

/** `https://studio.youquantified.com`, with no trailing slash. */
export function appBaseUrl(): string {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) {
    // Unset in production would hand out localhost links — and a QR code is
    // scanned, not read, so nobody would notice before it failed. Say so in
    // the logs; falling back keeps the page up.
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      console.error(
        `APP_BASE_URL is not set: links and QR codes will point at ${LOCAL}`,
      );
    }
    return LOCAL;
  }
  return raw.replace(/\/+$/, "");
}

/** The participant's door: `/p/<slug>`. */
export function publicProjectUrl(slug: string, path = ""): string {
  return `${appBaseUrl()}/p/${slug}${path}`;
}

/**
 * The QR code image for a project's participation link (see the route at
 * `api/p/[slug]/qr`). Relative, so the page, board and console load it from
 * wherever they are; the code itself always encodes `publicProjectUrl`.
 */
export function qrImagePath(
  slug: string,
  format: "svg" | "png" = "svg",
  download = false,
): string {
  return `/api/p/${slug}/qr?format=${format}${download ? "&download=1" : ""}`;
}
