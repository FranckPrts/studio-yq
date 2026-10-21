/**
 * studio-yq's own privacy and terms, at the foot of a participant page. Small
 * and in the project's dim colour: the page belongs to the organisers, and this
 * only says whose software it runs on.
 *
 * Always a new tab — a participant halfway through their avatar must not lose
 * it, and the participant-frontend preview must never navigate its frame.
 */
export default function LegalLinks({ dim }: { dim: string }) {
  const link = "underline-offset-4 hover:underline";
  return (
    <p className="flex gap-3 text-[11px]" style={{ color: dim }}>
      <a href="/privacy" target="_blank" rel="noopener" className={link}>
        privacy
      </a>
      <a href="/terms" target="_blank" rel="noopener" className={link}>
        terms
      </a>
    </p>
  );
}
