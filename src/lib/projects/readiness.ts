import { db } from "@/lib/db";
import { anonRateLimit } from "@/lib/supabase/management";

/**
 * Whether a project has everything a participant needs.
 *
 * All three buckets have to be filled before the doors open, because the
 * failure mode otherwise lands on a participant rather than on the tenant: an
 * open project with no script is a blank screen, and one with no provisioned
 * database is a save button that throws. Both are discovered at an event.
 *
 * Warnings are the things that are probably wrong but never block opening:
 * we can't be sure from here (anonymous sign-ins may have been turned on by
 * hand in Supabase), or the tenant may mean it (a script with no parameters).
 */

/** Below this many anonymous sign-ins per hour per IP, a venue's Wi-Fi runs out. */
const ANON_LIMIT_WARNING = 100;

export type Readiness = {
  ready: boolean;
  missing: string[];
  hasScript: boolean;
  hasConnection: boolean;
  provisioned: boolean;
  /** Probably wrong, never blocking. `text` reads like a `missing` entry. */
  warnings: ReadinessWarning[];
};

export type ReadinessWarning = {
  /** Which setup step it belongs to, so the checklist can show it there. */
  area: "database" | "parameters";
  text: string;
};

export async function projectReadiness(
  projectId: string,
  /**
   * Also read the live anonymous sign-in limit from Supabase. A network call,
   * so only the settings page asks for it — not the menu on every page.
   */
  { checkAnonLimit = false }: { checkAnonLimit?: boolean } = {},
): Promise<Readiness> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      connection: {
        select: {
          id: true,
          projectRef: true,
          publishableKey: true,
          provisionedAt: true,
          accessTokenEnc: true,
          anonSignInsEnabled: true,
        },
      },
      scripts: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, parameters: true },
      },
    },
  });

  const hasScript = !!project?.scripts.length;
  const connection = project?.connection;
  const hasConnection = !!connection?.projectRef && !!connection.publishableKey;
  const provisioned = !!connection?.provisionedAt;

  const missing: string[] = [];
  if (!hasConnection) missing.push("a Supabase project to write to");
  else if (!provisioned) missing.push("its tables — run provisioning");
  if (!hasScript) missing.push("a script to render");

  const warnings: ReadinessWarning[] = [];
  if (provisioned && !connection?.anonSignInsEnabled) {
    warnings.push({
      area: "database",
      text: "anonymous sign-ins may be off — participants can't save without them",
    });
  }
  if (provisioned && checkAnonLimit && connection) {
    const limit = await anonRateLimit(connection);
    if (limit !== null && limit < ANON_LIMIT_WARNING) {
      warnings.push({
        area: "database",
        text: `only ${limit} participants per hour can join from one network`,
      });
    }
  }
  const parameters = project?.scripts[0]?.parameters;
  if (hasScript && Array.isArray(parameters) && parameters.length === 0) {
    warnings.push({
      area: "parameters",
      text: "no parameters — participants have nothing to choose",
    });
  }

  return {
    ready: missing.length === 0,
    missing,
    hasScript,
    hasConnection,
    provisioned,
    warnings,
  };
}
