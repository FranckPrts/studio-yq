import { Skeleton, SkeletonHeader, SkeletonPage } from "@/design";

/** A wide studio page while it loads: the header, then a work area beside a panel. */
export default function Loading() {
  return (
    <SkeletonPage className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      <SkeletonHeader actions={1} divided />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-96" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </SkeletonPage>
  );
}
