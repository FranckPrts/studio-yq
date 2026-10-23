"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { projectReadiness } from "@/lib/projects/readiness";

export type SettingsState = { saved?: boolean; error?: string };

/**
 * Every action re-authorises. The role required differs by what is being
 * changed. A collaborator may run the project — open and close it, publish or
 * hide the conclusion — while renaming, members, and anything that deletes
 * data or the project itself stay with the owner.
 */

export async function renameProject(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "OWNER");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "A project needs a name." };
  if (name.length > 120) return { error: "That name is too long." };

  // The slug is deliberately left alone: it is in participant URLs, and a link
  // handed out at an event must not stop working because someone fixed a typo.
  await db.project.update({ where: { id: projectId }, data: { name } });

  revalidatePath(`/projects/${slug}`);
  return { saved: true };
}

export type ParticipationState = { error?: string };

/**
 * Opens or closes a project to participants.
 *
 * Opening is gated on readiness — see `projectReadiness`. The check is here and
 * not only in the UI because this is a POST endpoint, and because an incomplete
 * open is discovered by a participant rather than by the person who caused it.
 * Closing is never gated: shutting the doors must always work.
 */
export async function setOpenForParticipation(
  _prev: ParticipationState,
  formData: FormData,
): Promise<ParticipationState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  const open = formData.get("open") === "true";

  if (open) {
    const readiness = await projectReadiness(projectId);
    if (!readiness.ready) {
      return {
        error: `Not ready to open — this project still needs ${readiness.missing.join(", and ")}.`,
      };
    }
  }

  await db.project.update({
    where: { id: projectId },
    data: { openForParticipation: open },
  });

  revalidatePath(`/projects/${slug}`);
  return {};
}

/**
 * Publishes or withdraws the conclusion — held back until the event is over,
 * so no one reads how the runs went while theirs are still to come. Owner or
 * collaborator, like opening. Needs no
 * readiness check of its own; the conclusion sits behind the project's open
 * state either way.
 */
export async function setConclusionPublished(
  _prev: ParticipationState,
  formData: FormData,
): Promise<ParticipationState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  const publish = formData.get("publish") === "true";

  await db.project.update({
    where: { id: projectId },
    data: { conclusionPublishedAt: publish ? new Date() : null },
  });

  // Toggled from settings and from the conclusion editor; the menu pill shows it everywhere.
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/report/conclusion`);
  return {};
}

export type DeleteState = { error?: string };

/**
 * Deletes a project and everything we hold for it — scripts, members,
 * invitations, the stored Supabase and Gmail credentials, report history — by
 * cascade. The owner or a platform admin only, whatever role an admin also
 * holds as a member.
 *
 * Only our side. Nothing is revoked or deleted elsewhere: the tenant's Supabase
 * keeps every participant, avatar and score, and the OAuth grants stay until
 * the tenant revokes them. The confirmation lists those steps, because this
 * cannot do them. Revoking the grants here is a later improvement.
 *
 * Refused while open, so a live event can't lose its page to one confirmation.
 */
export async function deleteProject(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId, role, user } = await requireProjectRole(slug, "VIEWER");
  if (role !== "OWNER" && !user.isPlatformAdmin) {
    return { error: "Only the owner or an administrator can delete a project." };
  }

  if (String(formData.get("confirm") ?? "").trim() !== slug) {
    return { error: `Type ${slug} exactly to confirm.` };
  }

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { openForParticipation: true },
  });
  if (project.openForParticipation) {
    return { error: "Close the project to participants first." };
  }

  await db.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  redirect("/projects");
}
