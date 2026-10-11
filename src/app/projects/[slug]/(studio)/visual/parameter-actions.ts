"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import { validateParameters } from "@/lib/params/validate";
import { analyzeScript } from "@/lib/params/analyze";
import type { Parameter } from "@/lib/params/types";
import {
  coerceParticipantDetails,
  CONTACTS_SCHEMA_VERSION,
  type ParticipantDetails,
} from "@/lib/projects/participant-details";

export type SaveState = {
  error?: string;
  problems?: string[];
  warnings?: string[];
  /** `version` only when the declaration changed and a new one was cut. */
  saved?: { version?: number };
};

/**
 * Saves an edited declaration as a **new script version**, carrying the current
 * code forward unchanged.
 *
 * Editing in place would have been less code, but it would also mean "active =
 * highest version" stopped describing what a participant sees, and that a
 * declaration change — which can break an experience just as thoroughly as a
 * code change — had no way back. A version is cheap; a mid-event mistake with
 * no undo is not.
 *
 * The email question rides along on the same form but is saved in place on the
 * project: it is not part of the declaration, and an upload must not drop it.
 * Each part arrives only when it changed, so editing just the email question
 * does not cut a script version.
 */
export async function saveParameters(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId, user } = await requireProjectRole(slug, "COLLABORATOR");

  const rawParameters = formData.get("parameters");
  const rawDetails = formData.get("participantDetails");
  if (rawParameters === null && rawDetails === null) {
    return { error: "There was nothing to save." };
  }

  let details: ParticipantDetails | null = null;
  if (rawDetails !== null) {
    try {
      details = coerceParticipantDetails(JSON.parse(String(rawDetails)));
    } catch {
      return { error: "The email question could not be read." };
    }
    const refusal = await refuseEmailWithoutTable(projectId, details);
    if (refusal) return { error: refusal };
  }

  if (rawParameters === null) {
    await db.project.update({
      where: { id: projectId },
      data: { participantDetails: details! },
    });
    revalidatePath(`/projects/${slug}`);
    revalidatePath(`/projects/${slug}/visual`);
    return { saved: {} };
  }

  let parameters: Parameter[];
  try {
    parameters = JSON.parse(String(rawParameters)) as Parameter[];
  } catch {
    return { error: "The declaration could not be read." };
  }

  // The browser validates as you type, but this is the check that counts — a
  // Server Action is a POST endpoint, reachable without the page that hosts it.
  const problems = validateParameters(parameters);
  if (problems.length) return { problems };

  const current = await db.avatarScript.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (!current) {
    return { error: "Upload a script before editing its parameters." };
  }

  const analysis = analyzeScript(current.code, parameters);
  const warnings: string[] = [];
  if (analysis.declaredButUnread.length) {
    warnings.push(
      `Declared but not read by the sketch: ${analysis.declaredButUnread.join(", ")}.`,
    );
  }
  if (analysis.readButUndeclared.length) {
    warnings.push(
      `Read by the sketch but not declared: ${analysis.readButUndeclared.join(", ")} — these stay at the sketch's own defaults.`,
    );
  }

  const version = current.version + 1;
  // Together or not at all: one save button should not half-apply.
  await db.$transaction(async (tx) => {
    await tx.avatarScript.create({
      data: {
        projectId,
        version,
        label: current.label,
        code: current.code,
        parameters: parameters as never,
        extensions: current.extensions as never,
        uploadedById: user.id,
      },
    });
    if (details) {
      await tx.project.update({
        where: { id: projectId },
        data: { participantDetails: details },
      });
    }
  });

  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/visual`);
  return { saved: { version }, warnings: warnings.length ? warnings : undefined };
}

/**
 * Switching the email question on is refused while the tenant's database has
 * nowhere to put the answer — participants would type an address that is then
 * lost. Already-on stays editable, and off is always allowed, so a project
 * re-pointed at an older database can still be tidied up.
 */
async function refuseEmailWithoutTable(
  projectId: string,
  details: ParticipantDetails,
): Promise<string | null> {
  if (!details.email.enabled) return null;

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      participantDetails: true,
      connection: { select: { schemaVersion: true } },
    },
  });
  if (coerceParticipantDetails(project.participantDetails).email.enabled) {
    return null;
  }
  if ((project.connection?.schemaVersion ?? 0) >= CONTACTS_SCHEMA_VERSION) {
    return null;
  }
  return `Asking for an email needs database schema v${CONTACTS_SCHEMA_VERSION}. Re-run the schema on the database page first.`;
}
