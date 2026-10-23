import type { PlatformRole } from "@/generated/prisma/enums";

/**
 * What a person may start on the platform, decided in one place.
 *
 * `platformRole` is ordered — RESEARCHER includes everything CREATOR allows,
 * which includes everything MEMBER allows — and a platform admin may do all of
 * it. Callers ask these functions rather than comparing the role themselves, so
 * adding a level or a capability never means hunting for `=== "CREATOR"`.
 *
 * Pure, with no database access: callers pass the session user, whose role is
 * read fresh on every request, so a promotion takes effect immediately.
 */

type Holder = { isPlatformAdmin: boolean; platformRole: PlatformRole };

const RANK: Record<PlatformRole, number> = {
  MEMBER: 0,
  CREATOR: 1,
  RESEARCHER: 2,
};

function atLeast(user: Holder, role: PlatformRole): boolean {
  return user.isPlatformAdmin || RANK[user.platformRole] >= RANK[role];
}

/** May create projects of their own, becoming their owner. */
export function canCreateProjects(user: Holder): boolean {
  return atLeast(user, "CREATOR");
}

/**
 * May set up research consent on a project.
 *
 * Not used anywhere yet. Research is gated on the Studio-provided database —
 * participant data held by us, not in the tenant's own Supabase — which does
 * not exist yet. When it does, a project offers research only if its owner
 * passes this *and* the project runs on the Studio database.
 */
export function canCreateResearchConsent(user: Holder): boolean {
  return atLeast(user, "RESEARCHER");
}

export const PLATFORM_ROLES: { value: PlatformRole; label: string; blurb: string }[] = [
  { value: "MEMBER", label: "member", blurb: "works in projects they are invited into" },
  { value: "CREATOR", label: "creator", blurb: "may also create projects" },
  {
    value: "RESEARCHER",
    label: "researcher",
    blurb: "may also run research consent, once the Studio database exists",
  },
];
