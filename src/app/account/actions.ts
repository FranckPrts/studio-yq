"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { changePassword, setStudioTheme } from "@/lib/auth/account";

export type PasswordState = { error?: string; done?: string };

/**
 * A Server Action is a POST endpoint reachable without its page, so it
 * re-authorises for itself — and only ever acts on the signed-in user's own
 * account. There is no user id in the form to tamper with.
 */
export async function changeOwnPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await requireUser("/account");

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !password) {
    return { error: "Enter your current password and a new one." };
  }
  if (password !== confirm) return { error: "The new passwords do not match." };

  const result = await changePassword(user, current, password);
  if (!result.ok) return { error: result.error };

  return {
    done:
      result.signedOut > 0
        ? `Password changed. ${result.signedOut} other ${
            result.signedOut === 1 ? "device was" : "devices were"
          } signed out.`
        : "Password changed.",
  };
}

/**
 * The studio theme switch on /account. Same rule as above: it only ever acts on
 * the signed-in user, and the value is checked here rather than trusted from
 * the form. Revalidates from the root layout, which is where `data-theme` is
 * set, so every page the person has open picks the change up.
 */
export async function chooseStudioTheme(formData: FormData): Promise<void> {
  const user = await requireUser("/account");
  const theme = formData.get("theme");
  if (theme !== "DARK" && theme !== "LIGHT") return;

  await setStudioTheme(user.id, theme);
  revalidatePath("/", "layout");
}
