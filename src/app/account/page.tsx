import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { choiceClass, buttonClass } from "@/design";
import { chooseStudioTheme } from "./actions";
import PasswordForm from "./form";

export const dynamic = "force-dynamic";

/** Your own account: your studio theme and your password. Nothing here touches anyone else. */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-void p-4 md:p-8 text-paper">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-sm">Account</h1>
          <p className="text-xs text-dim">
            {user.email}
            {user.isPlatformAdmin && " · administrator"}
          </p>
        </div>
        <Link
          href="/projects"
          className={buttonClass("boxed", "xs")}
        >
          projects
        </Link>
      </header>

      <section className="flex w-full max-w-sm flex-col gap-4">
        <h2 className="text-xs text-dim">studio theme</h2>
        {/* Two submit buttons rather than a client toggle: it posts with no
            JavaScript, and the chosen one is underlined like any option row. */}
        <form action={chooseStudioTheme} className="flex gap-6" aria-label="studio theme">
          {(
            [
              ["DARK", "dark"],
              ["LIGHT", "light"],
            ] as const
          ).map(([value, label]) => {
            const active = user.studioTheme === value;
            return (
              <button
                key={value}
                type="submit"
                name="theme"
                value={value}
                aria-pressed={active}
                className={choiceClass(active)}
              >
                {label}
              </button>
            );
          })}
        </form>
        <p className="text-[11px] leading-relaxed text-dim">
          Yours alone — others on your projects keep their own. Participant
          pages always show the project&apos;s own colours.
        </p>
      </section>

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
