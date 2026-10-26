"use client";

import { useActionState } from "react";
import { setPlatformRoleAction, type AdminState } from "./actions";
import { PLATFORM_ROLES } from "@/lib/auth/capabilities";
import type { PlatformRole } from "@/generated/prisma/enums";
import { buttonClass } from "@/design";

type Person = {
  id: string;
  label: string;
  isAdmin: boolean;
  role: PlatformRole;
  owns: number;
};

function RoleForm({
  person,
  action,
  pending,
}: {
  person: Person;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="userId" value={person.id} />
      <select
        name="platformRole"
        defaultValue={person.role}
        aria-label={`Platform role for ${person.label}`}
        className="term-input rounded bg-surface px-2 py-1 text-xs"
      >
        {PLATFORM_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={buttonClass("boxed", "xs")}>
        set
      </button>
    </form>
  );
}

/**
 * Everyone with an account, and what each may start on the platform. Admins
 * may already do everything, so their role is shown but not what decides.
 */
export default function PeopleSection({ people }: { people: Person[] }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    setPlatformRoleAction,
    {},
  );

  return (
    <section className="flex flex-col gap-4 border-t border-paper/10 pt-6">
      <h2 className="text-xs text-dim">platform roles</h2>
      <ul className="flex flex-col gap-2 text-xs">
        {people.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-paper/10 pb-2"
          >
            <div className="min-w-0">
              <p className="truncate">{p.label}</p>
              <p className="text-dim">
                {p.isAdmin ? "administrator · may do everything" : PLATFORM_ROLES.find((r) => r.value === p.role)?.blurb}
                {p.owns > 0 && ` · owns ${p.owns} project${p.owns === 1 ? "" : "s"}`}
              </p>
            </div>
            <RoleForm person={p} action={action} pending={pending} />
          </li>
        ))}
      </ul>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
      {state.message && <p className="text-xs text-dim">{state.message}</p>}
      <p className="text-[11px] leading-relaxed text-dim">
        Each level includes the one above it. Like admin, a role is never sent
        in an invitation: invite someone as a member, then set it here once they
        have signed up. Lowering a role leaves the projects they made with them.
      </p>
    </section>
  );
}
