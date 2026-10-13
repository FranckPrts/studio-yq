"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { disconnectGmail } from "@/lib/report/gmail";
import { REPORT_NOTICE_VERSION } from "@/lib/report/notice";
import {
  audience,
  createRun,
  finishRun,
  SendRefused,
  stopRun,
  type RunRequest,
} from "@/lib/report/sending";

const pagePath = (slug: string) => `/projects/${slug}/report/send`;

/**
 * Agreeing to the pass-through notice — an owner's decision, recorded with who
 * and when, against the notice's current version.
 */
export async function acknowledgeNotice(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId, user } = await requireProjectRole(slug, "OWNER");
  if (Number(formData.get("version")) !== REPORT_NOTICE_VERSION) return; // agreed to old words
  await db.project.update({
    where: { id: projectId },
    data: {
      reportNoticeAckById: user.id,
      reportNoticeAckAt: new Date(),
      reportNoticeVersion: REPORT_NOTICE_VERSION,
    },
  });
  revalidatePath(pagePath(slug));
}

/** Withdrawing it stops any send, including one in progress. */
export async function withdrawNotice(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "OWNER");
  await db.project.update({
    where: { id: projectId },
    data: { reportNoticeAckById: null, reportNoticeAckAt: null, reportNoticeVersion: null },
  });
  revalidatePath(pagePath(slug));
}

export async function disconnectGmailAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "OWNER");
  await disconnectGmail(projectId);
  revalidatePath(pagePath(slug));
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function refusals<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await work()) };
  } catch (error) {
    if (error instanceof SendRefused) return { ok: false, error: error.message };
    if (error instanceof Error && error.message.startsWith("This project's Supabase")) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** Participant ids with an address on file, and those already sent theirs. */
export async function loadAudience(slug: string) {
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  return refusals(() => audience(projectId));
}

export async function startRun(slug: string, request: RunRequest) {
  const access = await requireProjectRole(slug, "COLLABORATOR");
  const result = await refusals(() =>
    createRun(
      { projectId: access.projectId, slug: access.slug, role: access.role, userId: access.user.id },
      request,
    ),
  );
  revalidatePath(pagePath(slug));
  return result;
}

export async function stopRunAction(slug: string, runId: string) {
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  await stopRun(projectId, runId);
  revalidatePath(pagePath(slug));
}

export async function finishRunAction(slug: string, runId: string) {
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");
  await finishRun(projectId, runId);
  revalidatePath(pagePath(slug));
}
