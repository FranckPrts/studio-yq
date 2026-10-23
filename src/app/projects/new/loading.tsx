import { Skeleton, SkeletonHeader, SkeletonLine, SkeletonPage } from "@/design";

/** The new-project form while it loads: two fields and the submit. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 bg-void p-8 text-paper">
      <SkeletonHeader actions={1} />
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonLine className="w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
        <Skeleton className="h-8 w-28" />
      </div>
    </SkeletonPage>
  );
}
