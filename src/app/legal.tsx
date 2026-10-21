import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The public pages anyone can read without an account — the home page, the
 * privacy policy, the terms. Google's OAuth verification reads all three, so
 * they must stay reachable signed out and must never redirect to sign-in.
 *
 * Drawn in the studio palette (dark when signed out, as the root layout sets),
 * never a project's: these pages speak for studio-yq, not for any tenant.
 */

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-void text-paper">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 pb-16 pt-10">
        <header className="flex items-baseline justify-between gap-4 text-sm">
          <Link href="/" className="hover:underline underline-offset-4">
            studio-yq
          </Link>
          <Link href="/signin" className="text-dim hover:text-paper hover:underline underline-offset-4">
            sign in
          </Link>
        </header>
        {children}
        <LegalFooter />
      </div>
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
      <span>studio-yq</span>
      <Link href="/privacy" className="hover:text-paper hover:underline underline-offset-4">
        privacy
      </Link>
      <Link href="/terms" className="hover:text-paper hover:underline underline-offset-4">
        terms
      </Link>
    </footer>
  );
}

/** A long document: a title, when it was last changed, then its sections. */
export function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-8 text-sm leading-relaxed">
      <div className="flex flex-col gap-1">
        <h1 className="text-base">{title}</h1>
        <p className="text-xs text-dim">Last updated {updated}</p>
      </div>
      {children}
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm text-paper">{title}</h2>
      <div className="flex flex-col gap-3 text-dim [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-normal [&_strong]:text-paper [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-paper">
        {children}
      </div>
    </section>
  );
}
