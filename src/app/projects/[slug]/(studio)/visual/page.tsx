import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/auth/dal";
import type { Parameter } from "@/lib/params/types";
import PageHeader from "../page-header";
import ScriptSection from "./section";
import ParameterBuilder from "./builder";
import ParameterList from "./parameter-list";

export const dynamic = "force-dynamic";

/**
 * The sketch and its declaration on one page, in two plainly separate parts:
 * the code that is uploaded as a whole, then the parameters grouped by the
 * screen a participant meets them on.
 */
export default async function VisualPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireProjectRole(slug, "VIEWER");

  const project = await db.project.findUniqueOrThrow({
    where: { id: access.projectId },
    select: {
      scripts: {
        orderBy: { version: "desc" },
        take: 20,
        select: {
          label: true,
          version: true,
          parameters: true,
          createdAt: true,
          uploadedById: true,
        },
      },
    },
  });

  const canEdit = access.role === "OWNER" || access.role === "COLLABORATOR";
  const active = project.scripts[0];
  const parameters = (active?.parameters ?? []) as unknown as Parameter[];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-8">
      <PageHeader
        title="script & parameters"
        subtitle="The p5 sketch, and which of its knobs a participant may turn."
      />

      <section className="flex max-w-3xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-dim uppercase">script</h2>
          <p className="max-w-prose text-[11px] leading-relaxed text-dim">
            Authored in YouQuantified&rsquo;s editor and uploaded here as a
            whole — nothing is edited in place.
          </p>
        </header>
        <ScriptSection
          slug={slug}
          canEdit={canEdit}
          versions={project.scripts.map((s) => ({
            version: s.version,
            label: s.label,
            parameterCount: (s.parameters as unknown[]).length,
            createdAt: s.createdAt.toISOString().slice(0, 10),
            uploadedBy: s.uploadedById,
          }))}
        />
      </section>

      <section
        id="parameters"
        className="flex flex-col gap-4 border-t border-paper/10 pt-8"
      >
        <header className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-dim uppercase">
            parameters
          </h2>
          <p className="max-w-prose text-[11px] leading-relaxed text-dim">
            {active
              ? `What participants are asked and what they control, from ${active.label ?? "script"} v${active.version}. ${
                  canEdit
                    ? `Saving creates v${active.version + 1} with the same code, so a parameter change rolls back like a code change.`
                    : ""
                }`
              : "Upload a script first — the declaration describes the controls for a sketch, so there has to be a sketch."}
          </p>
        </header>

        {active &&
          (canEdit ? (
            <ParameterBuilder
              slug={slug}
              scriptVersion={active.version}
              initial={parameters}
            />
          ) : (
            <ParameterList parameters={parameters} />
          ))}
      </section>
    </main>
  );
}
