import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/dal";
import { ButtonLink } from "@/design";
import { PublicShell } from "./legal";

/**
 * The front door, for anyone who is not signed in — and the page Google's
 * OAuth verification reads as our home page, so it says plainly what the app
 * is. Why it asks to send email is in the privacy policy, linked below.
 *
 * Signed in, it is still the signpost it always was: straight on to projects.
 * A participant never lands here; they arrive at `/p/[slug]` by their link.
 */

export const metadata: Metadata = {
  title: "studio-yq — You Quantified",
  description:
    "A studio for running participant avatar experiences, built on the open-source yq-data package from You Quantified.",
};

export default async function HomePage() {
  if (await currentUser()) redirect("/projects");

  return (
    <PublicShell>
      <section className="flex flex-col gap-4">
        <h1 className="text-base">studio-yq</h1>
        <p className="text-sm leading-relaxed">
          A studio for running participant avatar experiences — an
          independent project by Franck Porteous, built on the open-source
          yq-data package from You Quantified.
        </p>
        <p className="text-sm leading-relaxed text-dim">
          Research teams and event organisers use studio-yq to set up an
          experience in which each participant designs their own avatar, plays
          with it, and afterwards receives a short report of how it went. A
          project brings together the avatar script, the questions participants
          are asked, the look of the participant pages, and the team running
          it.
        </p>
        <div className="flex items-center gap-4">
          <ButtonLink href="/signin" variant="boxed" tone="strong">
            sign in
          </ButtonLink>
        </div>
      </section>

      <section className="flex flex-col gap-3 text-sm leading-relaxed">
        <h2 className="text-sm">Who it is for</h2>
        <p className="text-dim">
          Accounts are invitation-only. studio-yq is used by the research
          groups and event teams (&ldquo;tenants&rdquo;) we work with; there is
          no public sign-up. Participants never need an account — they join an
          experience through a link the organisers give them.
        </p>
      </section>
    </PublicShell>
  );
}
