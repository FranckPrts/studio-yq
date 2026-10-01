import type { Metadata } from "next";
import PrimitivesGallery from "./gallery";

/**
 * Every primitive in `src/design`, in every variant, rendered twice: once as an
 * admin page renders it (Geist, the `:root` palette nobody overrides) and once
 * under a project palette and typeface you can change on the page.
 *
 * That pairing is the point. A primitive that only looks right in Nowadays
 * brown has a colour baked in somewhere, and the light preset is the quickest
 * way to find out — anything that stays dark on a pale ground is the bug.
 *
 * Nothing here touches the database, so unlike `/dev/sketch` it renders with no
 * project created.
 */

export const metadata: Metadata = {
  title: "Primitives · dev",
};

export default function DevPrimitivesPage() {
  return <PrimitivesGallery />;
}
