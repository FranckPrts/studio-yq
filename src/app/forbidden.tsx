import Link from "next/link";
import { buttonClass } from "@/design";

/**
 * Shown when a project member tries something their role does not cover —
 * `requireProjectRole` calls `forbidden()` for members and `notFound()` for
 * everyone else. No props reach this file, so it cannot name the project or
 * the role; it says what happened and who can change it.
 */
export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-void p-4 md:p-8 text-paper">
      <h1 className="text-sm">Your role doesn&apos;t allow this</h1>
      <p className="max-w-prose text-xs leading-relaxed text-dim">
        You are on this project, but the thing you tried needs a higher role —
        viewers can only look, and a few actions (managing members, wiping or
        disconnecting the database, deleting the project) are for owners. Ask
        an owner of the project to change your role if you need to do this.
      </p>
      <div className="flex gap-3">
        <Link href="/projects" className={buttonClass("boxed", "xs")}>
          projects
        </Link>
      </div>
    </main>
  );
}
