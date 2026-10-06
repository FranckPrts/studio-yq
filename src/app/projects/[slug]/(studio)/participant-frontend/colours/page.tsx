import PageHeader from "../../page-header";
import { loadFrontend } from "../load";
import PaletteForm from "../palette-form";
import PreviewLink from "../preview-link";

export const dynamic = "force-dynamic";

export default async function ColoursPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { theme, canEdit } = await loadFrontend(slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <PageHeader
        title="style & language · colours"
        subtitle="The colours the participant page is drawn in."
      >
        <PreviewLink slug={slug} />
      </PageHeader>
      {canEdit ? (
        <PaletteForm
          slug={slug}
          palette={{ void: theme.void, paper: theme.paper, dim: theme.dim }}
        />
      ) : (
        <p className="text-xs text-dim">You have read-only access to this project.</p>
      )}
    </main>
  );
}
