"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { analyzeScript } from "@/lib/params/analyze";
import type { Parameter } from "@/lib/params/types";
import { MINI_HOST_KNOBS } from "@/lib/report/mini";

export type MiniUploadState = {
  error?: string;
  /** Cross-check findings, which do not block the upload. */
  warnings?: string[];
  uploaded?: { version: number };
};

/** Same sanity bound as the main script. */
const MAX_SCRIPT_BYTES = 2_000_000;

const pagePath = (slug: string) => `/projects/${slug}/report/mini-avatar`;

async function nextVersion(projectId: string): Promise<number> {
  const latest = await db.miniScript.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}

/**
 * Adds a mini-script version. Append-only, like the main script: a bad upload
 * is undone by promoting an earlier version.
 *
 * There is no declaration to upload. The mini-script reads the main script's
 * parameters, so the only check against them is a warning when it reads a name
 * the main declaration does not have — that value will never arrive.
 */
export async function uploadMiniScript(
  _prev: MiniUploadState,
  formData: FormData,
): Promise<MiniUploadState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");

  const sketch = formData.get("sketch");
  const label = String(formData.get("label") ?? "").trim();

  if (!(sketch instanceof File) || sketch.size === 0) {
    return { error: "Choose a mini-script .js file." };
  }
  if (sketch.size > MAX_SCRIPT_BYTES) {
    return { error: "That script is larger than 2 MB." };
  }

  const code = await sketch.text();
  if (!code.trim()) return { error: "That script file is empty." };

  // The same check the main upload makes: global mode has to define `draw`.
  if (!/\bdraw\s*=|\bfunction\s+draw\b/.test(code)) {
    return {
      error:
        "That file does not look like a p5 sketch — no `draw` is defined. Global mode is required (`draw = () => { … }`).",
    };
  }

  const main = await db.avatarScript.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { parameters: true },
  });
  if (!main) {
    return {
      error:
        "Upload the main script first — a mini-avatar draws with the main script's parameters.",
    };
  }

  const host = new Set<string>(MINI_HOST_KNOBS);
  const unknown = analyzeScript(
    code,
    main.parameters as unknown as Parameter[],
  ).readButUndeclared.filter((name) => !host.has(name));
  const warnings = unknown.length
    ? [
        `Read by the mini-script but not declared by the main script: ${unknown.join(", ")}. These never arrive, so they stay at the mini-script's own defaults.`,
      ]
    : undefined;

  const version = await nextVersion(projectId);
  await db.miniScript.create({
    data: {
      projectId,
      version,
      label: label || sketch.name.replace(/\.js$/i, "") || null,
      code,
      uploadedById: user.id,
    },
  });

  revalidatePath(pagePath(slug));
  return { uploaded: { version }, warnings };
}

/** Copies an earlier version to the top, so the history stays a record. */
export async function promoteMiniScript(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const version = Number(formData.get("version"));
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");
  if (!Number.isInteger(version)) return;

  const source = await db.miniScript.findFirst({
    where: { projectId, version },
  });
  if (!source) return;

  await db.miniScript.create({
    data: {
      projectId,
      version: await nextVersion(projectId),
      label: source.label ? `${source.label} (from v${source.version})` : null,
      code: source.code,
      uploadedById: user.id,
    },
  });

  revalidatePath(pagePath(slug));
}

/**
 * Goes back to drawing reports with the main script, as a version of its own
 * (null code) rather than a delete — the history says when it happened, and
 * the previous mini-script is a promote away.
 */
export async function revertToMainScript(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");

  const latest = await db.miniScript.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { code: true },
  });
  if (!latest?.code) return; // already on the main script

  await db.miniScript.create({
    data: {
      projectId,
      version: await nextVersion(projectId),
      label: null,
      code: null,
      uploadedById: user.id,
    },
  });

  revalidatePath(pagePath(slug));
}
