"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import {
  CONCLUSION_LIMITS,
  coerceConclusionPage,
} from "@/lib/report/conclusion-template";

export type ConclusionSaveState = { saved?: boolean; error?: string };

/**
 * Saves the conclusion's wording. A collaborator may, like the email — it is
 * content; publishing it is a separate switch on the settings page.
 *
 * Coerced on the way in, so only known fields are stored, each trimmed and
 * capped. An over-long body is refused rather than quietly cut.
 */
export async function saveConclusionPage(
  _prev: ConclusionSaveState,
  formData: FormData,
): Promise<ConclusionSaveState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const body = String(formData.get("body") ?? "");
  if (body.trim().length > CONCLUSION_LIMITS.body) {
    return { error: `The page is longer than ${CONCLUSION_LIMITS.body.toLocaleString()} characters.` };
  }

  const conclusionPage = coerceConclusionPage({
    body,
    empty: formData.get("empty"),
    pending: formData.get("pending"),
  });

  await db.project.update({
    where: { id: projectId },
    data: { conclusionPage },
  });

  revalidatePath(`/projects/${slug}/report/conclusion`);
  revalidatePath(`/p/${slug}/conclusion`);
  return { saved: true };
}
