"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/design";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("boxed", "xs")}>
      {pending ? "adding…" : label}
    </button>
  );
}

/**
 * A one-click way into the starter visual, wherever a project has nothing yet.
 * `action` is one of the `adoptStarter…` server actions; each re-checks role
 * and state for itself.
 */
export default function StarterButton({
  slug,
  action,
  label = "use the starter visual",
}: {
  slug: string;
  action: (formData: FormData) => Promise<void>;
  label?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <Submit label={label} />
    </form>
  );
}
