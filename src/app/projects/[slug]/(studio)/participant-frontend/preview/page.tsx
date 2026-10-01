import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import AllScreens from "./screens";

export const dynamic = "force-dynamic";

export default async function LivePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, lexicon, copy, hasQuestions } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · live preview"
        subtitle="Every screen a participant can reach, as currently saved."
      />
      <AllScreens
        slug={slug}
        theme={theme}
        lexicon={lexicon}
        copy={copy}
        hasQuestions={hasQuestions}
      />
    </main>
  );
}
