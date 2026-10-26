import { Skeleton, SkeletonHeader, SkeletonLine, SkeletonPage, SkeletonSection } from "@/design";

/** People while it loads: the header, the invite form, then the recent list. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-4 md:p-8 text-paper">
      <SkeletonHeader actions={1} />
      <SkeletonSection rows={3} />
      <div className="flex flex-col gap-4 border-t border-paper/10 pt-6">
        <SkeletonLine className="w-32" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-24" />
      </div>
      <SkeletonSection rows={4} />
    </SkeletonPage>
  );
}
