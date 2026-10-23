"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { canCreateProjects } from "@/lib/auth/capabilities";
import { createProject, freeSlugFor } from "@/lib/projects/create-project";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/slug";

export type NewProjectState = {
  error?: string;
  /** A free slug to offer when the chosen one is taken. */
  suggestion?: string;
  name?: string;
  slug?: string;
};

/**
 * Creates an empty project owned by the caller. Nothing else is made — no
 * script, no connection — so the project starts exactly as the overview
 * describes it, with each part offering its own way in.
 *
 * Re-checks the capability itself: this is a POST endpoint, reachable without
 * the page that hides the button.
 */
export async function createProjectAction(
  _prev: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const user = await requireUser("/projects/new");
  if (!canCreateProjects(user)) {
    return { error: "Your account can't create projects. Ask an administrator." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const echo = { name, slug };

  if (!name) return { ...echo, error: "A project needs a name." };
  if (name.length > 120) return { ...echo, error: "That name is too long." };
  if (RESERVED_SLUGS.includes(slug)) {
    return { ...echo, error: `/p/${slug} is reserved — pick another address.` };
  }
  if (!isValidSlug(slug)) {
    return {
      ...echo,
      error:
        "The address can use lowercase letters, numbers and single hyphens, up to 60 characters.",
    };
  }

  const taken = async () => ({
    ...echo,
    error: `/p/${slug} is already in use.`,
    suggestion: await freeSlugFor(slug),
  });

  if (await db.project.findUnique({ where: { slug }, select: { id: true } })) {
    return taken();
  }

  try {
    await createProject({ ownerId: user.id, name, slug });
  } catch (error) {
    // Lost a race for the same slug between the check and the insert.
    if ((error as { code?: string }).code === "P2002") return taken();
    throw error;
  }

  redirect(`/projects/${slug}`);
}
