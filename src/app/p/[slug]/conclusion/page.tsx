import type { Metadata } from "next";
import { fillCopy } from "@/lib/theme/project-copy";
import { loadReadingProject, readingMetadata } from "../reading";
import Shut from "../shut";
import Conclusion from "./conclusion";

/**
 * The CCN conclusion, rebuilt per project: how every run went, with the
 * reader's own marked. Public like the participant page — anyone with the link
 * sees the same figures; only the marks depend on the avatars this browser
 * made. Read from the tenant's Supabase in the browser, never through us.
 *
 * Held back until the people running it publish it after the event; until
 * then the address says so rather than 404ing, as a shut project does.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return readingMetadata((await params).slug);
}

export default async function ConclusionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await loadReadingProject(slug);
  if ("shut" in gate) return gate.shut;
  const { project } = gate;

  if (!project.conclusionOpen) {
    return (
      <Shut
        theme={project.theme}
        title={project.name}
        message={fillCopy(project.copy.conclusionPending, {
          noun: project.lexicon.noun,
          nounPlural: project.lexicon.nounPlural,
          project: project.name,
        })}
      />
    );
  }

  return (
    <>
      <link rel="preconnect" href={project.supabaseUrl} crossOrigin="" />
      <Conclusion
        slug={slug}
        projectName={project.name}
        theme={project.theme}
        lexicon={project.lexicon}
        copy={project.copy}
        supabaseUrl={project.supabaseUrl}
        publishableKey={project.publishableKey}
      />
    </>
  );
}
