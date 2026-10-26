import Link from "next/link";
import { requireUser, visibleProjects } from "@/lib/auth/dal";
import { signOut } from "@/app/signin/actions";
import { buttonClass } from "@/design";
import { canCreateProjects } from "@/lib/auth/capabilities";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const projects = await visibleProjects(user);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-4 md:p-8 text-paper">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-sm">Projects</h1>
          <p className="text-xs text-dim">
            {user.displayName ?? user.email}
            {user.isPlatformAdmin && " · administrator"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateProjects(user) && (
            <Link
              href="/projects/new"
              className={buttonClass("boxed", "xs", undefined, "strong")}
            >
              new project
            </Link>
          )}
          {user.isPlatformAdmin && (
            <Link
              href="/admin/invitations"
              className={buttonClass("boxed", "xs")}
            >
              invites
            </Link>
          )}
          <Link
            href="/account"
            className={buttonClass("boxed", "xs")}
          >
            account & settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className={buttonClass("boxed", "xs")}
            >
              sign out
            </button>
          </form>
        </div>
      </header>

      {projects.length === 0 ? (
        <p className="text-xs text-dim">
          You are not a member of any project yet.
          {canCreateProjects(user) && " Start one with “new project” above."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li
              key={project.slug}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-paper/10 pb-3"
            >
              <div className="min-w-0">
                <p className="text-sm">{project.name}</p>
                <p className="text-xs text-dim">
                  {project.slug} ·{" "}
                  {project.members[0]?.role.toLowerCase() ??
                    "visible as administrator"}{" "}
                  · {project.openForParticipation ? "open" : "closed"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/projects/${project.slug}`}
                  className={buttonClass("boxed", "xs")}
                >
                  open project
                </Link>
                <Link
                  href={`/projects/${project.slug}/participant-frontend/preview`}
                  className={buttonClass("boxed", "xs")}
                >
                  preview
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
