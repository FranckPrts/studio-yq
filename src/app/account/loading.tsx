import { Skeleton, SkeletonHeader, SkeletonLine, SkeletonPage } from "@/design";

/** Account while it loads: the theme choice, then the password form. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-8 text-paper">
      <SkeletonHeader actions={1} />
      <div className="flex w-full max-w-sm flex-col gap-4">
        <SkeletonLine className="w-24" />
        <div className="flex gap-6">
          <SkeletonLine className="w-12" />
          <SkeletonLine className="w-12" />
        </div>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <SkeletonLine className="w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-28" />
      </div>
    </SkeletonPage>
  );
}
