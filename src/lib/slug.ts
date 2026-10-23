/**
 * Slugify-on-create, following the shape of MindHive's `Study.ts` hook: derive
 * from the title, then disambiguate against what already exists.
 *
 * A project's slug appears in participant URLs, so it is assigned once and then
 * left alone — renaming a project must not break a link handed out at an event.
 */

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    // Strip accents, so "Étoile" and "Etoile" land on the same slug.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  // Everything can be stripped — CJK, emoji, punctuation alone. Callers still
  // need a usable URL segment, so fall back rather than return "".
  return slug || "project";
}

/**
 * Slugs that would shadow, or be shadowed by, a fixed route beside
 * `/projects/[slug]` — a project called "new" would be unreachable behind
 * `/projects/new`.
 */
export const RESERVED_SLUGS: readonly string[] = ["new"];

/**
 * `taken` is every existing slug that starts with the base. Returns the base if
 * it is free, otherwise the first free `base-2`, `base-3`, … — counting, not
 * appending a count, so a gap left by a deleted project gets reused instead of
 * the numbers climbing forever.
 */
export function uniqueSlug(input: string, taken: Iterable<string>): string {
  const base = slugify(input);
  const used = new Set([...taken, ...RESERVED_SLUGS]);
  if (!used.has(base)) return base;

  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * Whether a hand-typed slug is one `slugify` could have produced: lowercase
 * letters, digits and single hyphens, not at either end, at most 60 long.
 * Checked rather than silently slugified, so the URL someone approved is the
 * URL they get. Reserved slugs are refused.
 */
export function isValidSlug(slug: string): boolean {
  return (
    slug.length <= 60 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_SLUGS.includes(slug)
  );
}
