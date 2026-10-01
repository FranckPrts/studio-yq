import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import TextEditor from "./editor";

export const dynamic = "force-dynamic";

export default async function TextPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, lexicon, copy, canEdit } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · text & fonts"
        subtitle="The typeface, the word for what participants make, and every sentence they read."
      />
      <TextEditor
        slug={slug}
        theme={theme}
        lexicon={lexicon}
        copy={copy}
        canEdit={canEdit}
      />
    </main>
  );
}
