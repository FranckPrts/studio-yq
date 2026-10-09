"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "./actions";

export default function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changeOwnPassword,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Lets a password manager file the new password under the right
          account; never read by the action. */}
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">current password</span>
        <input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="term-input border-b border-paper/20"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">new password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="term-input border-b border-paper/20"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-dim">confirm new password</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="term-input border-b border-paper/20"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="text-xs text-dim">
          {state.done}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start text-sm text-paper underline underline-offset-4 disabled:text-dim"
      >
        {pending ? "changing…" : "change password"}
      </button>
    </form>
  );
}
