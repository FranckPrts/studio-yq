import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { canCreateProjects } from "@/lib/auth/capabilities";
import { buttonClass } from "@/design";
import NewProjectForm from "./form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await requireUser("/projects/new");
  // The same 404 as any page they can't reach; the button is hidden for them too.
  if (!canCreateProjects(user)) notFound();

  const base = (process.env.APP_BASE_URL ?? "http://localhost:3100").replace(
    /^https?:\/\//,
    "",
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 bg-void p-8 text-paper">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-sm">New project</h1>
          <p className="text-xs text-dim">You will be its owner.</p>
        </div>
        <Link href="/projects" className={buttonClass("boxed", "xs")}>
          cancel
        </Link>
      </header>
      <NewProjectForm base={base} />
    </main>
  );
}
