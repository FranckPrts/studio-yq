import "server-only";
import { randomBytes } from "node:crypto";

/**
 * One email as RFC 5322 text, for the Gmail API's `raw`.
 *
 *   multipart/alternative
 *   ├─ text/plain                — for clients that want no HTML
 *   └─ multipart/related
 *      ├─ text/html              — refers to the pictures as cid:
 *      └─ image/* (inline) …     — the pictures themselves
 *
 * Pictures travel inside the message rather than being linked: most clients
 * block remote images until the reader allows them, which would hide the
 * participant's own avatar on open.
 */

export type InlineImage = { cid: string; contentType: "image/png" | "image/jpeg"; data: Buffer };

export type MimeInput = {
  from: { name: string; email: string };
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  images: InlineImage[];
};

/** RFC 2047, for headers that are not plain ASCII. */
function encodeWord(value: string): string {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** A display name, quoted or encoded so that commas and quotes stay inside it. */
function mailbox(name: string, email: string): string {
  const clean = name.replace(/[\r\n"]/g, "").trim();
  if (!clean) return email;
  const shown = /^[\x20-\x7e]*$/.test(clean) ? `"${clean}"` : encodeWord(clean);
  return `${shown} <${email}>`;
}

/** Base64 in 76-character lines, as MIME requires. */
function base64Lines(data: Buffer): string {
  return (data.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

/** Header values cannot carry a line break — that would inject a header. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildMime(input: MimeInput): string {
  const alt = `alt_${randomBytes(12).toString("hex")}`;
  const rel = `rel_${randomBytes(12).toString("hex")}`;

  const headers = [
    `From: ${mailbox(input.from.name, oneLine(input.from.email))}`,
    `To: ${oneLine(input.to)}`,
    ...(input.replyTo ? [`Reply-To: ${oneLine(input.replyTo)}`] : []),
    `Subject: ${encodeWord(oneLine(input.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${alt}"`,
  ];

  const parts = [
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(input.text, "utf8")),
    `--${alt}`,
    `Content-Type: multipart/related; boundary="${rel}"`,
    "",
    `--${rel}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(input.html, "utf8")),
    ...input.images.flatMap((img) => [
      `--${rel}`,
      `Content-Type: ${img.contentType}`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${img.cid}>`,
      `Content-Disposition: inline; filename="${img.cid}.${img.contentType === "image/png" ? "png" : "jpg"}"`,
      "",
      base64Lines(img.data),
    ]),
    `--${rel}--`,
    `--${alt}--`,
    "",
  ];

  return [...headers, "", ...parts].join("\r\n");
}
