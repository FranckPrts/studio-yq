/**
 * A project's look: a palette and a typeface.
 *
 * Deliberately small — "a more elaborate dark-mode switch", not a design
 * system. Three colours, because that is what the markup actually consumes
 * (`bg-void`, `text-paper`, `text-dim` are already everywhere), and a typeface
 * from a list we host rather than an arbitrary upload, which keeps licensing
 * and loading our problem instead of the tenant's.
 *
 * The shape lives here rather than in the database because it is read whole and
 * never queried by field. `Project.theme` is a json column holding exactly this.
 *
 * What each colour is for, and what stays out of the tenant's hands:
 * `docs/participant-styling.md`.
 */

export type ProjectTheme = {
  /** Background. */
  void: string;
  /** Body text. */
  paper: string;
  /** Secondary text and labels. */
  dim: string;
  /** Key into `FONTS`. */
  font: FontKey;
};

export const FONTS = {
  // Served by next/font from our own origin (loaded once in the root layout),
  // so it is genuinely hosted by us rather than fetched from a third party at
  // view time. The face the CCN / Nowadays experience actually shipped with.
  dmMono: {
    label: "DM Mono",
    stack: "var(--font-dm-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  mono: {
    label: "Terminal mono",
    stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  sans: {
    label: "Neutral sans",
    stack: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  },
  serif: {
    label: "Quiet serif",
    stack: "ui-serif, Georgia, Cambria, Times New Roman, serif",
  },
} as const;

export type FontKey = keyof typeof FONTS;

/**
 * The default dark palette and face — what the CCN / Nowadays experience shipped with, so a
 * project nobody has styled looks like the original. Projects that already
 * saved a font keep it; only an unset one picks this up.
 */
export const DEFAULT_THEME: ProjectTheme = {
  void: "#14100e",
  paper: "#ece5d8",
  dim: "#7f776b",
  font: "dmMono",
};

const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG 2 contrast ratio between two `#rrggbb` colours, from 1 to 21.
 * Anything that is not a six-digit hex yields `NaN` rather than a guess.
 */
export function contrast(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) return NaN;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The text that sits on `void` must read: 4.5:1, WCAG AA for body-size text.
 * `dim` carries the 11px hints and labels, so it is held to the same floor as
 * `paper` — there is no large-text allowance for it to lean on.
 */
export const MIN_TEXT_CONTRAST = 4.5;

export type ContrastIssue = {
  role: "paper" | "dim";
  ratio: number;
};

/**
 * The palette's text roles that fall short of `MIN_TEXT_CONTRAST` on `void`.
 * Advisory: the palette form warns and still saves — a tenant may have a
 * reason, and a projector in a dark room is not a phone in daylight.
 */
export function contrastIssues(
  palette: Pick<ProjectTheme, "void" | "paper" | "dim">,
): ContrastIssue[] {
  return (["paper", "dim"] as const)
    .map((role) => ({ role, ratio: contrast(palette[role], palette.void) }))
    .filter(({ ratio }) => ratio < MIN_TEXT_CONTRAST);
}

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

/**
 * Normalize-on-read, as everywhere else: a theme edited straight in the
 * database, or written by an older version of this form, still yields a
 * complete and renderable set rather than a page with no background colour.
 */
export function coerceTheme(value: unknown): ProjectTheme {
  if (!value || typeof value !== "object") return { ...DEFAULT_THEME };
  const raw = value as Record<string, unknown>;
  return {
    void: hex(raw.void, DEFAULT_THEME.void),
    paper: hex(raw.paper, DEFAULT_THEME.paper),
    dim: hex(raw.dim, DEFAULT_THEME.dim),
    font:
      typeof raw.font === "string" && raw.font in FONTS
        ? (raw.font as FontKey)
        : DEFAULT_THEME.font,
  };
}

/**
 * CSS custom properties for a project, named to match `globals.css`'s `@theme`
 * block — so every `bg-void` / `text-dim` utility already in the markup
 * resolves to tenant values with no change to the markup itself.
 *
 * Inlined by the server into the page it renders, which is what keeps the
 * palette from flickering in after hydration.
 */
export function themeCssVars(theme: ProjectTheme): Record<string, string> {
  return {
    "--color-void": theme.void,
    "--color-paper": theme.paper,
    "--color-dim": theme.dim,
  };
}

export type ProjectLexicon = { noun: string; nounPlural: string };

export const DEFAULT_LEXICON: ProjectLexicon = {
  noun: "avatar",
  nounPlural: "avatars",
};

export function coerceLexicon(value: unknown): ProjectLexicon {
  if (!value || typeof value !== "object") return { ...DEFAULT_LEXICON };
  const raw = value as Record<string, unknown>;
  const noun = typeof raw.noun === "string" ? raw.noun.trim() : "";
  const plural = typeof raw.nounPlural === "string" ? raw.nounPlural.trim() : "";
  return {
    noun: noun || DEFAULT_LEXICON.noun,
    // A missing plural is more likely an oversight than a choice, so derive one
    // rather than falling all the way back to "avatars".
    nounPlural: plural || (noun ? `${noun}s` : DEFAULT_LEXICON.nounPlural),
  };
}
