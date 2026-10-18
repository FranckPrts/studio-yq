import Link from "next/link";
import { buttonClass } from "@/design";

/** Previews live on their own tab now; the editing pages point there. */
export default function PreviewLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/projects/${slug}/participant-frontend/preview`}
      className={buttonClass("boxed", "xs")}
    >
      live preview →
    </Link>
  );
}
