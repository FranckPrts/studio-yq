"use client";

import { useActionState } from "react";
import { joinAsSignedIn, type AcceptState } from "./actions";
import { buttonClass } from "@/design";

export default function JoinForm({
  token,
  label,
}: {
  token: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(
    joinAsSignedIn,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className={buttonClass("boxed")}
      >
        {pending ? "joining…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
