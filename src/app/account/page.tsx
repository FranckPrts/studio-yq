import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import PasswordForm from "./form";

export const dynamic = "force-dynamic";

/** Your own account. Today that is the password; nothing here touches anyone else. */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-8 text-paper">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-sm">Account</h1>
          <p className="text-xs text-dim">
            {user.email}
            {user.isPlatformAdmin && " · administrator"}
          </p>
        </div>
        <Link
          href="/projects"
          className="text-xs text-dim underline-offset-4 hover:text-paper hover:underline"
        >
          projects
        </Link>
      </header>

      <section className="flex w-full max-w-sm flex-col gap-4">
        <h2 className="text-xs text-dim">password</h2>
        <PasswordForm email={user.email} />
        <p className="text-[11px] leading-relaxed text-dim">
          Changing it signs you out everywhere else; this device stays signed
          in. Forgotten it? Ask an administrator — there is no reset by email.
        </p>
      </section>
    </main>
  );
}
