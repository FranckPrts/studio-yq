import { redirect } from "next/navigation";

/**
 * Style & language is three pages now; the bare URL — bookmarked, or linked
 * from somewhere older — lands on the first of them.
 */
export default async function ParticipantFrontendPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/projects/${slug}/participant-frontend/colours`);
}
