import { SkeletonHeader, SkeletonPage, SkeletonSection } from "@/design";

/** The projects list while it loads: the header and its actions, then rows. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-8 text-paper">
      <SkeletonHeader actions={3} />
      <SkeletonSection rows={4} />
    </SkeletonPage>
  );
}
