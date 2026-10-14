/**
 * The light markdown tenants write for participants — in the report email and
 * on the conclusion page — parsed once, rendered by each in its own way.
 *
 * Paragraphs, **bold**, *italic*, links ([text](https://…), [text](mailto:…)
 * or a bare https:// address), "- " lists, "> " quotes, {placeholders}, and
 * named blocks, each on a paragraph of its own: {map} in an email, {histogram}
 * on the conclusion. `{#runs}…{/runs}` and `{#noruns}…{/noruns}` keep a
 * passage for people who played, or for people who didn't.
 *
 * Nothing here is ever HTML. The email turns blocks into escaped markup; the
 * conclusion turns `parseInline`'s tree into React elements, which escape
 * themselves.
 */

const CONDITIONAL = /\{#(runs|noruns)\}([\s\S]*?)\{\/\1\}/g;
export const PLACEHOLDER = /\{([A-Za-z_][\w]*)\}/g;

export function applyConditionals(body: string, played: boolean): string {
  return body.replace(CONDITIONAL, (_, which: string, inner: string) =>
    (which === "runs") === played ? inner : "",
  );
}

export type Block<Name extends string = string> =
  | { kind: "block"; name: Name }
  | { kind: "heading"; level: 1 | 2; text: string }
  | { kind: "p" | "quote"; lines: string[] }
  | { kind: "list"; items: string[] };

/**
 * Splits a body into blocks on blank lines. A paragraph that is exactly
 * `{name}` for one of `blocks` becomes that block; with `headings`, a one-line
 * paragraph starting "# " or "## " becomes a heading.
 */
export function parseBlocks<Name extends string>(
  body: string,
  options: { blocks: readonly Name[]; headings?: boolean },
): Block<Name>[] {
  const only = new RegExp(`^\\{(${options.blocks.join("|")})\\}$`);
  const out: Block<Name>[] = [];
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (lines.length === 0) continue;
    const single = lines.length === 1 ? lines[0].trim() : null;
    const block = single !== null && options.blocks.length > 0 ? only.exec(single) : null;
    const heading = single !== null && options.headings ? /^(#{1,2})\s+(.+)$/.exec(single) : null;
    if (block) out.push({ kind: "block", name: block[1] as Name });
    else if (heading)
      out.push({ kind: "heading", level: heading[1].length as 1 | 2, text: heading[2] });
    else if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
      out.push({ kind: "list", items: lines.map((l) => l.replace(/^\s*[-*]\s+/, "")) });
    else if (lines.every((l) => /^\s*>/.test(l)))
      out.push({ kind: "quote", lines: lines.map((l) => l.replace(/^\s*>\s?/, "")) });
    else out.push({ kind: "p", lines: lines.map((l) => l.trim()) });
  }
  return out;
}

// ─── Inline, as a tree ───────────────────────────────────────────────────────

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

/** Marks a placeholder's spot until its value goes in, after markdown has run. */
const SENTINEL = /\u0000(\d+)\u0000/g;
const LINK =
  /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|(https?:\/\/[^\s<>"]+)/g;
const TRAILING = /[.,;:!?)\]'"]+$/;
const EMPHASIS =
  /\*\*([^*]+)\*\*|(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])|(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/;

/**
 * One line of light markdown as a tree, with `values` filling its
 * {placeholders}. Placeholders become sentinels before any markdown is read,
 * so a participant named "**x**" stays exactly that — the same order the email
 * keeps. An unknown placeholder becomes empty.
 */
export function parseInline(raw: string, values: Record<string, string>): Inline[] {
  const slots: string[] = [];
  const marked = raw.replace(PLACEHOLDER, (_, key: string) => {
    slots.push(values[key] ?? "");
    return `\u0000${slots.length - 1}\u0000`;
  });
  const fill = (s: string) => s.replace(SENTINEL, (_, i: string) => slots[Number(i)]);

  const text = (s: string): Inline[] => (s ? [{ type: "text", value: fill(s) }] : []);

  const emphasis = (s: string): Inline[] => {
    const m = EMPHASIS.exec(s);
    if (!m) return text(s);
    const before = s.slice(0, m.index);
    const after = s.slice(m.index + m[0].length);
    if (m[1] !== undefined)
      return [...text(before), { type: "strong", children: emphasis(m[1]) }, ...emphasis(after)];
    const lead = m[2] ?? m[4] ?? "";
    const inner = m[3] ?? m[5] ?? "";
    return [
      ...text(before + lead),
      { type: "em", children: emphasis(inner) },
      ...emphasis(after),
    ];
  };

  const out: Inline[] = [];
  let last = 0;
  for (const m of marked.matchAll(LINK)) {
    const [match, label, url, bare] = m;
    out.push(...emphasis(marked.slice(last, m.index)));
    if (label && url) {
      out.push({ type: "link", href: fill(url), children: emphasis(label) });
      last = m.index + match.length;
    } else {
      const tail = bare.match(TRAILING)?.[0] ?? "";
      const href = fill(bare.slice(0, bare.length - tail.length));
      out.push({ type: "link", href, children: [{ type: "text", value: href }] });
      last = m.index + match.length - tail.length;
    }
  }
  out.push(...emphasis(marked.slice(last)));
  return out;
}

/** Control characters out — newlines and tabs stay — including the sentinels'. */
export function cleanTemplate(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}
