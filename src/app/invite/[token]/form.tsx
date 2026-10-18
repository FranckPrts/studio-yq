"use client";

import { useActionState } from "react";
import { acceptInvitation, type AcceptState } from "./actions";
import { buttonClass } from "@/design";

export default function AcceptForm({
  token,
  lockedEmail,
}: {
  token: string;
  lockedEmail: string | null;
}) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(
    acceptInvitation,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={lockedEmail ?? ""}
          readOnly={!!lockedEmail}
          className={`term-input rounded bg-surface px-2 py-1.5 ${
            lockedEmail ? "text-dim" : ""
          }`}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">name (optional)</span>
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          className="term-input rounded bg-surface px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="term-input rounded bg-surface px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">confirm password</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="term-input rounded bg-surface px-2 py-1.5"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("boxed", "sm", "mt-2")}
      >
        {pending ? "creating…" : "create account"}
      </button>
    </form>
  );
}
