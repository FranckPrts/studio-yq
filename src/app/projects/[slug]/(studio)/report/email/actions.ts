"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import {
  coerceReportEmail,
  isEmailAddress,
  REPORT_EMAIL_LIMITS,
} from "@/lib/report/email-template";

export type EmailSaveState = { saved?: boolean; error?: string };

/**
 * Saves the report email's wording. A collaborator may, like the participant
 * copy — it is content. Sending is the owner's alone, and lives elsewhere.
 *
 * Coerced on the way in, so only known fields are stored, each trimmed and
 * capped. The two things coercion would quietly drop are refused instead, so
 * the tenant learns about them now rather than at send time.
 */
export async function saveReportEmail(
  _prev: EmailSaveState,
  formData: FormData,
): Promise<EmailSaveState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const replyTo = String(formData.get("replyTo") ?? "").trim();
  if (replyTo && !isEmailAddress(replyTo)) {
    return { error: "The reply-to address doesn't look like an email address." };
  }
  const body = String(formData.get("body") ?? "");
  if (body.trim().length > REPORT_EMAIL_LIMITS.body) {
    return { error: `The body is longer than ${REPORT_EMAIL_LIMITS.body.toLocaleString()} characters.` };
  }

  const reportEmail = coerceReportEmail({
    subject: formData.get("subject"),
    senderName: formData.get("senderName"),
    replyTo,
    look: formData.get("look"),
    body,
  });

  await db.project.update({
    where: { id: projectId },
    data: { reportEmail },
  });

  revalidatePath(`/projects/${slug}/report/email`);
  return { saved: true };
}
