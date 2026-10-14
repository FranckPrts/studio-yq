import type { Metadata } from "next";
import { loadReadingProject, readingMetadata } from "../reading";
import Results from "./results";

/**
 * A participant's own results at their own address, so the people running the
 * event can point at it — on a slide, a QR code, an email. Read in the
 * browser from the tenant's Supabase, as the participant page does; none of
 * it passes through us.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return readingMetadata((await params).slug);
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gate = await loadReadingProject(slug);
  if ("shut" in gate) return gate.shut;
  const { project } = gate;

  return (
    <>
      <link rel="preconnect" href={project.supabaseUrl} crossOrigin="" />
      <Results
        slug={slug}
        projectName={project.name}
        theme={project.theme}
        lexicon={project.lexicon}
        copy={project.copy}
        supabaseUrl={project.supabaseUrl}
        publishableKey={project.publishableKey}
        conclusionOpen={project.conclusionOpen}
      />
    </>
  );
}
