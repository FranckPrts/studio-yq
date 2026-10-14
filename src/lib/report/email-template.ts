import type { FontKey } from "@/lib/theme/project-theme";
import { applyConditionals, parseBlocks, PLACEHOLDER } from "./markup";

/**
 * The participant report email: what the tenant writes, and how it becomes a
 * message.
 *
 * The body is light markdown — paragraphs, **bold**, *italic*, links
 * ([text](https://…), [text](mailto:…) or a bare https:// address), "- " lists
 * and "> " quotes — with {placeholders} for the participant's own
 * details, and three image blocks, each on a paragraph of its own: {portrait},
 * {map} and {histogram}. Anything else is text: never HTML, from the tenant or
 * from a participant's name, so nothing either types can change the markup.
 *
 * Kept deliberately plain, as the CCN recap was: the email should read like
 * something a person typed, not a newsletter. Inline styles only, because
 * email clients strip <style> and ignore classes; a table to centre it, because
 * Outlook ignores `margin: auto`; and a plain-text half for clients that want it.
 */

export type EmailLook = "plain" | "project";

export type ReportEmail = {
  subject: string;
  /** Blank means the project's name. */
  senderName: string;
  /** Where replies go. Blank means the sending account. */
  replyTo: string;
  look: EmailLook;
  body: string;
};

export const REPORT_EMAIL_LIMITS = {
  subject: 200,
  senderName: 100,
  replyTo: 254,
  body: 10_000,
} as const;

export const IMAGE_BLOCKS = ["portrait", "map", "histogram"] as const;
export type ImageBlock = (typeof IMAGE_BLOCKS)[number];

export const DEFAULT_REPORT_EMAIL: ReportEmail = {
  subject: "Your {noun} from {project}",
  senderName: "",
  replyTo: "",
  look: "plain",
  body: `Hello,

Thank you for taking part in {project}. Here is {name}, as you made it:

{portrait}

{#runs}
You played {runs} times, with {partners} different people. Your best score was {best_score}, in the {percentile} percentile of every run on the day.

{map}

Your {noun} is circled. The dashed rings are the people you played with, and the numbers are your scores together.

{histogram}
{/runs}
{#noruns}
You didn't get to play this time, but your {noun} is on the map with everyone else's:

{map}
{/noruns}

Thank you,
The {project} team`,
};

/** The placeholders every project has, for the editor to offer. */
export const PLACEHOLDERS: { key: string; description: string }[] = [
  { key: "name", description: "Their avatar's name — several joined with “and”" },
  { key: "noun", description: "What participants make" },
  { key: "nounPlural", description: "…in the plural" },
  { key: "project", description: "The project's name" },
  { key: "runs", description: "How many times they played" },
  { key: "partners", description: "How many different people they played with" },
  { key: "best_score", description: "Their best score" },
  { key: "avg_score", description: "Their average score" },
  { key: "percentile", description: "Where their best falls among every run, e.g. 79th" },
  { key: "top_strategy", description: "The note on their best run, if any" },
];

export const IMAGE_DESCRIPTIONS: Record<ImageBlock, string> = {
  portrait: "Their mini-avatar — all of them, side by side",
  map: "The map, with theirs circled",
  histogram: "Every run's score, marking their best",
};

export const CONDITIONALS: { open: string; close: string; description: string }[] = [
  { open: "{#runs}", close: "{/runs}", description: "Only for people who played" },
  { open: "{#noruns}", close: "{/noruns}", description: "Only for people who didn't" },
];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Normalize-on-read. A blank subject or body falls back to the default rather
 * than sending an empty message; a malformed reply-to is dropped.
 */
export function coerceReportEmail(value: unknown): ReportEmail {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const replyTo = text(raw.replyTo, REPORT_EMAIL_LIMITS.replyTo);
  return {
    subject: text(raw.subject, REPORT_EMAIL_LIMITS.subject) || DEFAULT_REPORT_EMAIL.subject,
    senderName: text(raw.senderName, REPORT_EMAIL_LIMITS.senderName),
    replyTo: EMAIL.test(replyTo) ? replyTo : "",
    look: raw.look === "project" ? "project" : "plain",
    body: text(raw.body, REPORT_EMAIL_LIMITS.body) || DEFAULT_REPORT_EMAIL.body,
  };
}

export function isEmailAddress(value: string): boolean {
  return EMAIL.test(value);
}

// ─── Look ────────────────────────────────────────────────────────────────────

export type EmailStyle = {
  bg: string;
  text: string;
  muted: string;
  link: string;
  /** Installed fonts only — webfonts do not load in most email clients. */
  font: string;
  size: string;
};

/**
 * Email-safe stand-ins for the project's typefaces. Multi-word names are
 * quoted, or strict clients drop the whole declaration.
 */
const EMAIL_FONTS: Record<FontKey, string> = {
  dmMono: "'DM Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace",
  mono: "ui-monospace, Menlo, Consolas, 'Courier New', monospace",
  sans: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
};

/**
 * "plain" is the CCN recap's: white, the ordinary link blue, a serif. "project"
 * takes the project's palette and the nearest installed face to its typeface.
 */
export function emailStyle(
  look: EmailLook,
  theme: { void: string; paper: string; dim: string; font: FontKey },
): EmailStyle {
  if (look === "project") {
    return {
      bg: theme.void,
      text: theme.paper,
      muted: theme.dim,
      link: theme.paper,
      font: EMAIL_FONTS[theme.font],
      size: theme.font === "serif" ? "16px" : "15px",
    };
  }
  return {
    bg: "#ffffff",
    text: "#222222",
    muted: "#555555",
    link: "#1155cc",
    font: "'Times New Roman', Times, serif",
    size: "16px",
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export type EmailImage = {
  src: string;
  /** Width to show it at, in CSS pixels (the file is usually twice that). */
  width: number;
  alt: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  /** The image blocks this body actually uses, after conditionals. */
  images: ImageBlock[];
};

/** Marks a placeholder's spot until its value goes in, after markdown has run. */
const SENTINEL = /\u0000(\d+)\u0000/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Links, in markdown or bare: `[text](https://…)`, `[text](mailto:…)`, or an
 * address pasted on its own. Only http(s) and mailto can reach an href.
 * The bare form stops at whitespace, `<`, and the escaped quote/angle
 * entities, and leaves trailing punctuation outside — "see https://x.org."
 * links x.org, not "x.org.".
 */
const LINK =
  /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|(https?:\/\/(?:(?!&quot;|&lt;|&gt;)[^\s<])+)/g;
const TRAILING = /[.,;:!?)\]'"]+$/;
/** Holds a finished link while bold and italics run, so they never touch it. */
const LINK_SLOT = /\u0001(\d+)\u0001/g;

/**
 * Inline markdown on already-escaped text. Placeholders are sentinels at this
 * point, so a participant named "**x**" stays exactly that.
 *
 * Links are made first and set aside, so an underscore pair inside a URL
 * (`/my_page_here`) is never read as italics.
 */
function inlineHtml(escaped: string, linkStyle: string): string {
  const links: string[] = [];
  const keep = (html: string) => {
    links.push(html);
    return `\u0001${links.length - 1}\u0001`;
  };
  return escaped
    .replace(LINK, (match, label?: string, url?: string, bare?: string) => {
      if (label && url) return keep(`<a href="${url}" style="${linkStyle}">${label}</a>`);
      const tail = bare!.match(TRAILING)?.[0] ?? "";
      const href = bare!.slice(0, bare!.length - tail.length);
      return keep(`<a href="${href}" style="${linkStyle}">${href}</a>`) + tail;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g, "$1<em>$2</em>")
    .replace(LINK_SLOT, (_, i: string) => links[Number(i)]);
}

function inlineText(raw: string): string {
  return raw
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,
      (_, label: string, url: string) => `${label} (${url.replace(/^mailto:/, "")})`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

/**
 * Builds the message for one participant.
 *
 * `values` fills {placeholders}; an unknown one becomes empty. `played` picks
 * the conditional blocks. An image block without an image in `images` is
 * dropped, so a missing picture leaves no gap or broken icon.
 */
export function renderReportEmail(
  template: ReportEmail,
  values: Record<string, string>,
  played: boolean,
  images: Partial<Record<ImageBlock, EmailImage>>,
  style: EmailStyle,
): RenderedEmail {
  const fill = (s: string) => s.replace(PLACEHOLDER, (_, key: string) => values[key] ?? "");

  const subject = fill(template.subject).replace(/\s+/g, " ").trim();
  const blocks = parseBlocks(applyConditionals(template.body, played), { blocks: IMAGE_BLOCKS });

  // ---- html ----
  const textCss = `font-family:${style.font};font-size:${style.size};line-height:1.55;color:${style.text};`;
  const linkCss = `color:${style.link};`;
  const used: ImageBlock[] = [];

  const htmlInline = (raw: string) => {
    const slots: string[] = [];
    const marked = raw.replace(PLACEHOLDER, (_, key: string) => {
      slots.push(escapeHtml(values[key] ?? ""));
      return `\u0000${slots.length - 1}\u0000`;
    });
    return inlineHtml(escapeHtml(marked), linkCss).replace(SENTINEL, (_, i: string) => slots[Number(i)]);
  };

  const htmlParts = blocks.map((b) => {
    if (b.kind === "block") {
      const img = images[b.name];
      if (!img) return "";
      used.push(b.name);
      return `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" width="${img.width}" style="display:block;width:${img.width}px;max-width:100%;height:auto;margin:24px 0;border:0;" />`;
    }
    if (b.kind === "heading") return "";
    if (b.kind === "list") {
      const items = b.items.map((i) => `<li style="${textCss}margin:0 0 4px;">${htmlInline(i)}</li>`).join("");
      return `<ul style="${textCss}margin:0 0 14px;padding-left:22px;">${items}</ul>`;
    }
    // Line breaks are kept, unlike markdown's reflow: the form is a textarea,
    // and a sign-off typed on two lines should arrive on two lines.
    const body = b.lines.map(htmlInline).join("<br>");
    return b.kind === "quote"
      ? `<blockquote style="${textCss}margin:14px 0;padding-left:12px;border-left:2px solid ${style.muted};color:${style.muted};">${body}</blockquote>`
      : `<p style="${textCss}margin:0 0 14px;">${body}</p>`;
  });

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${style.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${style.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;text-align:left;">
<tr><td style="${textCss}">
${htmlParts.filter(Boolean).join("\n")}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  // ---- plain text ----
  const textParts = blocks
    .map((b) => {
      // Headings are the conclusion's; an email body is parsed without them.
      if (b.kind === "block" || b.kind === "heading") return "";
      // Markdown first, values after, so a participant's name is never read
      // as markup — the same order as the HTML half.
      if (b.kind === "list") return b.items.map((i) => `- ${fill(inlineText(i))}`).join("\n");
      const lines = b.lines.map((l) => fill(inlineText(l)));
      return b.kind === "quote" ? lines.map((l) => `> ${l}`).join("\n") : lines.join("\n");
    })
    .filter(Boolean);

  return { subject, html, text: `${textParts.join("\n\n")}\n`, images: used };
}
