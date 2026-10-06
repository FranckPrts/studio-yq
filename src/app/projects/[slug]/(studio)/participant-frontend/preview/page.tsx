import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import PreviewPane from "../preview-pane";

export const dynamic = "force-dynamic";

export default async function LivePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, lexicon, copy } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · live preview"
        subtitle="The participant page as currently saved, one screen at a time."
      />
      <PreviewPane slug={slug} theme={theme} lexicon={lexicon} copy={copy} />
    </main>
  );
}
