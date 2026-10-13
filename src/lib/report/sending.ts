import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { ReportRunKind, Role } from "@/generated/prisma/enums";
import { participantEmail, reachableOwners } from "@/lib/spoke/ops";
import { coerceTheme } from "@/lib/theme/project-theme";
import {
  coerceReportEmail,
  emailStyle,
  IMAGE_BLOCKS,
  renderReportEmail,
  type EmailImage,
  type ImageBlock,
  type ReportEmail,
} from "./email-template";
import { GMAIL_RECONNECT, sendingAccount, sendRaw } from "./gmail";
import { buildMime, type InlineImage } from "./mime";
import { REPORT_NOTICE_VERSION } from "./notice";

/**
 * The rules of sending, kept on the server where they cannot be skipped.
 *
 * The browser draws each participant's pictures — it has the mini-avatars — and
 * posts them with the participant's placeholder values. Everything that
 * decides whether, what and to whom is here:
 *
 * - nothing is sent before an owner has agreed to the current pass-through
 *   notice, and a Gmail account is connected;
 * - every run fixes its recipients when it is created (`plan`), and a message
 *   for anyone outside the plan is refused;
 * - the email is rendered from the text saved when the run began, never from
 *   what the browser sends, so a request can carry values and pictures but not
 *   markup;
 * - addresses are resolved here, at the moment of sending, and go nowhere but
 *   into the message — participants' from their own Supabase, the team's from
 *   their accounts.
 */

export type RecipientKey = `p:${string}` | `t:${string}:${string}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Runs that write to participants — only owners may create them. */
const TO_PARTICIPANTS: ReportRunKind[] = ["PARTICIPANTS", "EVERYONE"];

export function templateHash(template: ReportEmail): string {
  return createHash("sha256").update(JSON.stringify(template)).digest("hex");
}

export class SendRefused extends Error {}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function sendingStatus(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      reportEmail: true,
      reportNoticeAckAt: true,
      reportNoticeVersion: true,
      reportNoticeAckBy: { select: { email: true, displayName: true } },
      gmail: {
        select: {
          googleEmail: true,
          createdAt: true,
          updatedAt: true,
          connectedById: true,
        },
      },
    },
  });
  const template = coerceReportEmail(project.reportEmail);
  const hash = templateHash(template);
  const tested = await db.reportDelivery.findFirst({
    where: {
      status: "SENT",
      teamUserId: { not: null },
      run: { projectId, templateHash: hash },
    },
    select: { createdAt: true },
  });
  return {
    notice: {
      current: project.reportNoticeVersion === REPORT_NOTICE_VERSION && !!project.reportNoticeAckAt,
      version: project.reportNoticeVersion,
      at: project.reportNoticeAckAt,
      by: project.reportNoticeAckBy,
    },
    gmail: project.gmail,
    template,
    templateHash: hash,
    testedAt: tested?.createdAt ?? null,
  };
}

async function requireReady(projectId: string) {
  const status = await sendingStatus(projectId);
  if (!status.notice.current) {
    throw new SendRefused("An owner has to agree to the notice about participant emails first.");
  }
  if (!status.gmail) throw new SendRefused("Connect a Gmail account to send from first.");
  return status;
}

// ─── Who ─────────────────────────────────────────────────────────────────────

export type TeamMember = { userId: string; name: string; email: string; role: Role };

/** Everyone with a role on the project — the team copies may go to. */
export async function teamMembers(projectId: string): Promise<TeamMember[]> {
  const rows = await db.membership.findMany({
    where: { projectId },
    select: { role: true, user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    userId: m.user.id,
    name: m.user.displayName || m.user.email,
    email: m.user.email,
    role: m.role,
  }));
}

/** Participants who have already been sent their own report, in any run. */
export async function alreadySent(projectId: string): Promise<Set<string>> {
  const rows = await db.reportDelivery.findMany({
    where: { status: "SENT", teamUserId: null, run: { projectId } },
    select: { subjectOwner: true },
    distinct: ["subjectOwner"],
  });
  return new Set(rows.map((r) => r.subjectOwner));
}

/**
 * Who could be sent a report right now: an address on file and an avatar.
 * Ids only. Requires the notice, because it reads the contacts table.
 */
export async function audience(projectId: string) {
  await requireReady(projectId);
  const [reachable, sent] = await Promise.all([
    reachableOwners(projectId, new Date()),
    alreadySent(projectId),
  ]);
  return { reachable, alreadySent: [...sent] };
}

// ─── Creating a run ──────────────────────────────────────────────────────────

export type RunRequest =
  | { kind: "TEST"; teamUserIds: string[]; subjectOwner: string }
  | { kind: "REHEARSAL"; teamUserIds: string[]; subjectOwners: string[] }
  | { kind: "PARTICIPANTS"; owners: string[] }
  | {
      kind: "EVERYONE";
      typedSlug: string;
      typedCount: number;
      includeAlreadySent: boolean;
      checkedPreview: boolean;
    };

/** Gmail's daily cap is ~500 (personal) or ~2,000 (Workspace); stay under it. */
const MAX_PER_RUN = 450;
/** More than this belongs in "everyone", with its checks. */
const MAX_CHOSEN = 25;

export async function createRun(
  access: { projectId: string; slug: string; role: Role; userId: string },
  request: RunRequest,
) {
  const status = await requireReady(access.projectId);
  const kind = request.kind;
  if (TO_PARTICIPANTS.includes(kind) && access.role !== "OWNER") {
    throw new SendRefused("Only an owner can send to participants.");
  }

  let plan: RecipientKey[];
  let skipped = 0;

  if (kind === "TEST" || kind === "REHEARSAL") {
    const team = new Set((await teamMembers(access.projectId)).map((m) => m.userId));
    const users = [...new Set(request.teamUserIds)];
    if (users.length === 0) throw new SendRefused("Add someone from the team to send to.");
    if (users.some((u) => !team.has(u))) throw new SendRefused("Team copies only go to members of this project.");
    const owners =
      kind === "TEST" ? [request.subjectOwner] : [...new Set(request.subjectOwners)];
    if (owners.length === 0 || owners.some((o) => !UUID.test(o))) {
      throw new SendRefused("Pick whose report the team should receive.");
    }
    plan = users.flatMap((u) => owners.map((o) => `t:${u}:${o}` as const));
  } else {
    // Sending to participants needs the saved text to have reached the team.
    if (!status.testedAt) {
      throw new SendRefused(
        "Send the team a test of the current saved text first. Any edit to the text needs a new one.",
      );
    }
    const reachable = new Set(await reachableOwners(access.projectId, new Date()));
    if (kind === "PARTICIPANTS") {
      const chosen = [...new Set(request.owners)].filter((o) => UUID.test(o));
      if (chosen.length === 0) throw new SendRefused("Add a participant to send to.");
      if (chosen.length > MAX_CHOSEN) {
        throw new SendRefused(`More than ${MAX_CHOSEN} at once is a send to everyone — use that, with its checks.`);
      }
      const ok = chosen.filter((o) => reachable.has(o));
      skipped = chosen.length - ok.length;
      if (ok.length === 0) throw new SendRefused("None of them gave an email address.");
      plan = ok.map((o) => `p:${o}` as const);
    } else {
      if (request.typedSlug.trim() !== access.slug) {
        throw new SendRefused("The project name typed doesn't match.");
      }
      if (!request.checkedPreview) throw new SendRefused("Confirm you have read the preview.");
      const sent = request.includeAlreadySent ? new Set<string>() : await alreadySent(access.projectId);
      const owners = [...reachable].filter((o) => !sent.has(o));
      skipped = reachable.size - owners.length;
      // The count is checked against what the server finds now, so a number
      // typed off a stale page — someone joined since — is refused, not trusted.
      if (request.typedCount !== owners.length) {
        throw new SendRefused(
          `The count typed doesn't match: ${owners.length} would receive it now. Reload and check again.`,
        );
      }
      if (owners.length === 0) throw new SendRefused("Nobody left to send to.");
      plan = owners.map((o) => `p:${o}` as const);
    }
  }

  if (plan.length > MAX_PER_RUN) {
    throw new SendRefused(`That is ${plan.length} emails; Gmail allows about ${MAX_PER_RUN} a day. Send in parts.`);
  }

  const run = await db.reportRun.create({
    data: {
      projectId: access.projectId,
      kind,
      frozenAt: new Date(),
      template: status.template,
      templateHash: status.templateHash,
      plan,
      total: plan.length,
      createdById: access.userId,
    },
    select: { id: true, frozenAt: true },
  });
  return { runId: run.id, frozenAt: run.frozenAt.toISOString(), plan, skipped };
}

// ─── Sending one ─────────────────────────────────────────────────────────────

export type DeliveryRequest = {
  runId: string;
  recipientKey: string;
  values: Record<string, unknown>;
  played: boolean;
  images: Partial<Record<string, { dataUrl: string; width: number; alt: string }>>;
};

export type DeliveryResult =
  | { status: "sent" }
  | { status: "already" }
  | { status: "failed"; error: string };

const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 3_000_000;

function cleanValues(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw ?? {}).slice(0, 80)) {
    if (/^[A-Za-z_]\w{0,39}$/.test(k) && typeof v === "string") out[k] = v.slice(0, 600);
  }
  return out;
}

function cleanImages(raw: DeliveryRequest["images"]) {
  const images: Partial<Record<ImageBlock, EmailImage>> = {};
  const inline: InlineImage[] = [];
  for (const block of IMAGE_BLOCKS) {
    const img = raw?.[block];
    if (!img) continue;
    const m = DATA_URL.exec(img.dataUrl ?? "");
    if (!m) continue;
    const data = Buffer.from(m[2], "base64");
    if (data.length === 0 || data.length > MAX_IMAGE_BYTES) continue;
    const cid = `${block}-${Math.random().toString(36).slice(2, 10)}@studio-yq`;
    inline.push({ cid, contentType: m[1] as InlineImage["contentType"], data });
    images[block] = {
      src: `cid:${cid}`,
      width: Math.max(1, Math.min(600, Math.round(Number(img.width) || 600))),
      alt: String(img.alt ?? "").slice(0, 200),
    };
  }
  return { images, inline };
}

export async function deliver(
  access: { projectId: string; role: Role },
  request: DeliveryRequest,
): Promise<DeliveryResult> {
  const run = await db.reportRun.findFirst({
    where: { id: request.runId, projectId: access.projectId },
  });
  if (!run) throw new SendRefused("No such send.");
  if (run.stoppedAt) throw new SendRefused("This send was stopped.");
  if (TO_PARTICIPANTS.includes(run.kind) && access.role !== "OWNER") {
    throw new SendRefused("Only an owner can send to participants.");
  }
  const plan = run.plan as string[];
  if (!plan.includes(request.recipientKey)) throw new SendRefused("Not a recipient of this send.");

  const done = await db.reportDelivery.findUnique({
    where: { runId_recipientKey: { runId: run.id, recipientKey: request.recipientKey } },
    select: { status: true },
  });
  if (done?.status === "SENT") return { status: "already" };

  // Re-checked per message: withdrawing the notice or disconnecting Gmail
  // stops a send in progress.
  await requireReady(access.projectId);

  const [prefix, a, b] = request.recipientKey.split(":");
  const team = prefix === "t";
  const subjectOwner = team ? b : a;
  const teamUserId = team ? a : null;

  const record = async (result: { status: "SENT" | "FAILED"; error?: string; gmailMessageId?: string }) => {
    const data = {
      status: result.status,
      error: result.error ?? null,
      gmailMessageId: result.gmailMessageId ?? null,
    };
    await db.reportDelivery.upsert({
      where: { runId_recipientKey: { runId: run.id, recipientKey: request.recipientKey } },
      create: { runId: run.id, recipientKey: request.recipientKey, subjectOwner, teamUserId, ...data },
      update: data,
    });
  };

  try {
    // The address, at the last moment.
    let to: string | null;
    if (team) {
      const member = await db.membership.findFirst({
        where: { projectId: access.projectId, userId: teamUserId! },
        select: { user: { select: { email: true } } },
      });
      to = member?.user.email ?? null;
    } else {
      to = await participantEmail(access.projectId, subjectOwner);
    }
    if (!to) {
      await record({ status: "FAILED", error: team ? "No longer on the team." : "No email address on file." });
      return { status: "failed", error: team ? "No longer on the team." : "No email address on file." };
    }

    const template = coerceReportEmail(run.template);
    const project = await db.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: { name: true, theme: true },
    });
    const { images, inline } = cleanImages(request.images);
    const rendered = renderReportEmail(
      template,
      cleanValues(request.values),
      request.played === true,
      images,
      emailStyle(template.look, coerceTheme(project.theme)),
    );
    // A team copy says so, so nobody mistakes a test for the real thing.
    const subject = team ? `[test] ${rendered.subject}` : rendered.subject;

    const mime = buildMime({
      from: { name: template.senderName || project.name, email: await sendingAccount(access.projectId) },
      to,
      replyTo: template.replyTo || undefined,
      subject,
      text: rendered.text,
      html: rendered.html,
      images: inline.filter((i) => rendered.images.some((k) => i.cid.startsWith(`${k}-`))),
    });
    to = null; // done with it

    const gmailMessageId = await sendRaw(access.projectId, mime);
    await record({ status: "SENT", gmailMessageId });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sending failed.";
    await record({ status: "FAILED", error: message.slice(0, 300) });
    if (message === GMAIL_RECONNECT) throw new SendRefused(message);
    return { status: "failed", error: message };
  }
}

export async function stopRun(projectId: string, runId: string) {
  await db.reportRun.updateMany({
    where: { id: runId, projectId, stoppedAt: null, finishedAt: null },
    data: { stoppedAt: new Date() },
  });
}

export async function finishRun(projectId: string, runId: string) {
  await db.reportRun.updateMany({
    where: { id: runId, projectId, finishedAt: null },
    data: { finishedAt: new Date() },
  });
}

export async function recentRuns(projectId: string) {
  const runs = await db.reportRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      kind: true,
      total: true,
      createdAt: true,
      finishedAt: true,
      stoppedAt: true,
      createdById: true,
      deliveries: { select: { status: true } },
    },
  });
  const users = await db.user.findMany({
    where: { id: { in: [...new Set(runs.map((r) => r.createdById))] } },
    select: { id: true, email: true, displayName: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.displayName || u.email]));
  return runs.map((r) => ({
    id: r.id,
    kind: r.kind,
    total: r.total,
    sent: r.deliveries.filter((d) => d.status === "SENT").length,
    failed: r.deliveries.filter((d) => d.status === "FAILED").length,
    createdAt: r.createdAt.toISOString(),
    by: nameOf.get(r.createdById) ?? "someone",
    state: r.stoppedAt ? "stopped" : r.finishedAt ? "finished" : "open",
  }));
}
