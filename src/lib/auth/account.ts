import "server-only";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { currentSessionTokenHash } from "./session";
import {
  accountKey,
  checkThrottle,
  clearFailures,
  recordFailure,
  throttledMessage,
  throttleKeys,
} from "./throttle";

export type ChangePasswordResult =
  | { ok: true; signedOut: number }
  | { ok: false; error: string };

/**
 * Changes a signed-in user's own password.
 *
 * The current password is required even though the session already proves who
 * this is: a session is exactly what an unattended laptop or a stolen cookie
 * hands over, and neither should be enough to lock the real owner out.
 *
 * Every *other* session ends in the same transaction as the new hash is
 * written — a change made because a password leaked has to cut off whoever
 * holds it, and a crash between the two writes must not leave them signed in.
 * The session making the change survives, so the person who just proved the
 * old password is not bounced to the sign-in page for their trouble.
 *
 * Wrong current passwords count against the same throttle as sign-in, so a
 * stolen session cannot be turned into an unlimited guessing oracle.
 */
export async function changePassword(
  account: { id: string; email: string },
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const userId = account.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };

  const keys = await throttleKeys(account.email);
  const throttle = await checkThrottle(keys);
  if (throttle.blocked) return { ok: false, error: throttledMessage(throttle) };

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    await recordFailure(keys);
    return { ok: false, error: "Your current password is not right." };
  }
  await clearFailures(accountKey(account.email));
  if (newPassword === currentPassword) {
    return { ok: false, error: "That is your current password. Choose a new one." };
  }
  const weak = passwordProblem(newPassword);
  if (weak) return { ok: false, error: weak };

  const passwordHash = await hashPassword(newPassword);
  const keep = await currentSessionTokenHash();

  const [, revoked] = await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.deleteMany({
      where: { userId, ...(keep ? { NOT: { tokenHash: keep } } : {}) },
    }),
  ]);

  return { ok: true, signedOut: revoked.count };
}
