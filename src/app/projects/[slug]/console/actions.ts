"use server";

import { requireProjectRole } from "@/lib/auth/dal";
import { MAX_STRATEGY_LENGTH } from "@/lib/board";
import {
  deleteScore,
  setStaged,
  unstageAll,
  updateScore,
  type ScoreEdit,
} from "@/lib/spoke/ops";

export type StageState = { error?: string };

/**
 * Collaborators and owners can stage; viewers can watch. Running the room at an
 * event is operational work, and it is exactly what a collaborator is for.
 *
 * No `revalidatePath`: the console learns about the change the same way it
 * learns about the scene un-staging a pair — from Realtime. Treating
 * `is_staged` as observed state rather than state we own is what keeps the two
 * writers from disagreeing.
 */
export async function stageAction(formData: FormData): Promise<StageState> {
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const staged = formData.get("staged") === "true";
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const result = await setStaged(projectId, id, staged);
  return result.ok ? {} : { error: result.error };
}

export async function unstageAllAction(formData: FormData): Promise<StageState> {
  const slug = String(formData.get("slug") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const result = await unstageAll(projectId);
  return result.ok ? {} : { error: result.error };
}

/** `saved` is the edit as stored, so the console can show it without a refetch. */
export type ScoreState = { error?: string; saved?: ScoreEdit };

/** The form's fields, or the sentence to show when one won't do. */
function parseScoreEdit(formData: FormData): ScoreEdit | string {
  const strategy = String(formData.get("strategy") ?? "").trim();
  if (strategy.length > MAX_STRATEGY_LENGTH) {
    return `Keep the strategy under ${MAX_STRATEGY_LENGTH} characters.`;
  }

  // `Number("")` is 0, so emptiness is checked on the raw text first.
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const score = Number(scoreRaw);
  if (!scoreRaw || !Number.isFinite(score)) return "The score has to be a number.";

  const durationRaw = String(formData.get("duration") ?? "").trim();
  const duration = durationRaw ? Number(durationRaw) : null;
  if (duration !== null && !(Number.isFinite(duration) && duration >= 0)) {
    return "The duration is in seconds — a number, or leave it empty.";
  }

  return { strategy: strategy || null, score, duration };
}

/**
 * Correcting a session after the scene wrote it — above all, typing in the
 * strategy the pair describe once their run is over. Same standing as staging:
 * it is part of running the room.
 */
export async function updateScoreAction(formData: FormData): Promise<ScoreState> {
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const edit = parseScoreEdit(formData);
  if (typeof edit === "string") return { error: edit };

  const result = await updateScore(projectId, id, edit);
  return result.ok ? { saved: edit } : { error: result.error };
}

/** For a run that should not count — a false start, a test, a forged insert. */
export async function deleteScoreAction(formData: FormData): Promise<ScoreState> {
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const { projectId } = await requireProjectRole(slug, "COLLABORATOR");

  const result = await deleteScore(projectId, id);
  return result.ok ? {} : { error: result.error };
}
