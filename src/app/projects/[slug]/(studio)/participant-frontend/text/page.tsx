import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import TypeForm from "../type-form";
import CopyForm from "../copy-form";
import PreviewLink from "../preview-link";

export const dynamic = "force-dynamic";

export default async function TextPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, lexicon, copy, canEdit } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · text & fonts"
        subtitle="The typeface, the word for what participants make, and every sentence they read."
      >
        <PreviewLink slug={slug} />
      </PageHeader>
      {canEdit ? (
        <>
          <TypeForm slug={slug} font={theme.font} lexicon={lexicon} />
          <section className="flex flex-col gap-4 border-t border-paper/10 pt-8">
            <h2 className="text-sm">wording</h2>
            <CopyForm slug={slug} copy={copy} />
          </section>
        </>
      ) : (
        <p className="text-xs text-dim">You have read-only access to this project.</p>
      )}
    </main>
  );
}
