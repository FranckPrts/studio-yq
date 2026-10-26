import { SkeletonHeader, SkeletonPage, SkeletonSection } from "@/design";

/**
 * Any studio page while it loads. Drawn inside the studio layout, so the menu
 * stays where it is and only the page beside it is a skeleton. The wider pages
 * (the visual builder, the report, the preview) have their own at their width.
 */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-8">
      <SkeletonHeader divided />
      <SkeletonSection rows={2} />
      <SkeletonSection rows={3} />
    </SkeletonPage>
  );
}
