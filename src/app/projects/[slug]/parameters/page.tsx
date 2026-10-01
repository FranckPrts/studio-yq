import { redirect } from "next/navigation";

/**
 * Parameters are edited on the script page now, under the script they belong
 * to. Older links land there.
 */
export default async function ParametersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/projects/${slug}/visual#parameters`);
}
