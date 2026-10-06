import Link from "next/link";

/** Previews live on their own tab now; the editing pages point there. */
export default function PreviewLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/projects/${slug}/participant-frontend/preview`}
      className="text-dim underline-offset-4 hover:text-paper hover:underline"
    >
      live preview →
    </Link>
  );
}
