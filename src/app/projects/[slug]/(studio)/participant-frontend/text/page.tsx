import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import TextForm from "../text-form";
import PreviewLink from "../preview-link";

export const dynamic = "force-dynamic";

export default async function TextPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { lexicon, copy, canEdit } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · text & participant copy"
        subtitle="The word for what participants make, and every sentence they read."
      >
        <PreviewLink slug={slug} />
      </PageHeader>
      {canEdit ? (
        <TextForm slug={slug} lexicon={lexicon} copy={copy} />
      ) : (
        <p className="text-xs text-dim">You have read-only access to this project.</p>
      )}
    </main>
  );
}
