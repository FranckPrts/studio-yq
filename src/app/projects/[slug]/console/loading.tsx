import { Skeleton, SkeletonHeader, SkeletonPage } from "@/design";

/** The live console while it loads: its header, then the panels. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 bg-void p-4 md:p-8 text-paper">
      <SkeletonHeader actions={1} divided />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </SkeletonPage>
  );
}
