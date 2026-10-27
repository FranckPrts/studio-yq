import Link from "next/link";
import { Badge, buttonClass } from "@/design";

/**
 * The settings page's top while a project is closed: the setup in the order it
 * has to happen, so a tenant can get from a blank project to an open one without
 * a guide. The database comes first because it is the slowest step and the one
 * the others lean on — the scene hookup lives on its page.
 *
 * Steps the platform can check carry a state. The scene hookup can't be checked
 * from here (the scene writes to the tenant's database, not to us), so it is a
 * reminder, not a tick. Optional steps never block "next".
 */

export type SetupStep = {
  key: string;
  title: string;
  blurb: string;
  href: string;
  /** null — nothing the platform can check. */
  done: boolean | null;
  optional?: boolean;
  /** Done, but something there looks off. Shown, never blocking. */
  warnings?: string[];
};

export function setupSteps({
  slug,
  databaseReady,
  databaseState,
  databaseWarnings,
  hasScript,
  parameterCount,
  hasTeam,
  open,
}: {
  slug: string;
  databaseReady: boolean;
  databaseState: string;
  databaseWarnings: string[];
  hasScript: boolean;
  parameterCount: number;
  hasTeam: boolean;
  open: boolean;
}): SetupStep[] {
  const base = `/projects/${slug}`;
  return [
    {
      key: "database",
      title: "connect your database",
      blurb: databaseReady
        ? databaseState
        : "Create a new Supabase project for this experiment, connect it here, then let us set up its tables and anonymous sign-ins.",
      href: `${base}/database`,
      done: databaseReady,
      warnings: databaseReady ? databaseWarnings : [],
    },
    {
      key: "visual",
      title: "add your avatar",
      blurb: hasScript
        ? "A script is uploaded."
        : "Upload the p5 script exported from the YouQuantified editor, or start from the starter.",
      href: `${base}/visual`,
      done: hasScript,
    },
    {
      key: "parameters",
      title: "choose what participants decide",
      blurb:
        parameterCount > 0
          ? `${parameterCount} parameter${parameterCount === 1 ? "" : "s"} declared.`
          : "Pick which of the script's knobs a participant may turn. Without any, there is nothing to choose.",
      href: `${base}/visual`,
      done: hasScript && parameterCount > 0,
    },
    {
      key: "style",
      title: "make it look like yours",
      blurb: "Palette, typeface and the words participants read. The defaults work.",
      href: `${base}/participant-frontend/colours`,
      done: null,
      optional: true,
    },
    {
      key: "team",
      title: "invite your team",
      blurb: hasTeam ? "Someone else is on the project." : "Collaborators can edit, viewers can only look.",
      href: "#members",
      done: hasTeam,
      optional: true,
    },
    {
      key: "scene",
      title: "connect your YouQuantified scene",
      blurb: databaseReady
        ? "Paste the scene config from the database page into your scene script."
        : "The scene config appears on the database page once it is set up.",
      href: `${base}/database#scene-hookup`,
      done: null,
    },
    {
      key: "open",
      title: "open participation",
      blurb: "Participants can reach the link once it is open.",
      href: "#participation",
      done: open,
    },
  ];
}

export default function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  // "Next" is the first step that can be ticked and isn't, skipping optional
  // ones. The scene can't be ticked, so it is never "next" — it is the step
  // right before opening, and its row says so.
  const next = steps.find((s) => !s.optional && s.done === false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs text-dim">set up</h2>
        {next && (
          <Link href={next.href} className={buttonClass("boxed", "sm", undefined, "strong")}>
            next: {next.title}
          </Link>
        )}
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className="flex gap-3 border-b border-paper/10 py-3 hover:border-paper/30"
            >
              <span className="w-4 shrink-0 text-xs text-dim">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-4">
                  <span className={`text-sm ${step.done ? "text-dim" : "text-paper"}`}>
                    {step.title}
                  </span>
                  <StepState step={step} />
                </span>
                <span className="text-[11px] leading-relaxed text-dim">{step.blurb}</span>
                {step.warnings?.map((w) => (
                  <span key={w} className="text-[11px] leading-relaxed text-warning/80">
                    Check: {w}.
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepState({ step }: { step: SetupStep }) {
  if (step.done && step.warnings?.length) return <Badge tone="warning">check</Badge>;
  if (step.done) return <Badge>done</Badge>;
  if (step.optional) return <Badge>optional</Badge>;
  if (step.done === null) return <Badge>by hand</Badge>;
  return <Badge tone="warning">to do</Badge>;
}
