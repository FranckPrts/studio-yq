/**
 * Questions about the participant themselves, as opposed to the avatar they
 * make — today only an optional email address.
 *
 * Kept apart from the parameter declaration on purpose. A `text` parameter is
 * an answer *about the avatar* and lands in `avatars.answers`, which every
 * participant and the scene can read. An email address belongs to the person,
 * so it goes to its own table, `participant_contacts`, readable only by the
 * participant who wrote it. And the declaration is replaced wholesale by a
 * script upload, which must not quietly stop a project collecting addresses.
 *
 * Shared by the studio and the participant page, so nothing here may touch the
 * server.
 */

export type EmailQuestion = {
  enabled: boolean;
  /** What the participant sees, before any "(optional)" marker. */
  label: string;
  placeholder: string;
  required: boolean;
};

export type ParticipantDetails = { email: EmailQuestion };

/** The tenant schema version that first has `participant_contacts`. */
export const CONTACTS_SCHEMA_VERSION = 2;

/** RFC 5321's limit, and the one the tenant table's CHECK enforces. */
export const MAX_EMAIL_LENGTH = 254;

const MAX_LABEL_LENGTH = 80;
const MAX_PLACEHOLDER_LENGTH = 120;

export const DEFAULT_PARTICIPANT_DETAILS: ParticipantDetails = {
  email: { enabled: false, label: "email", placeholder: "", required: false },
};

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

/**
 * Normalize-on-read, like the copy. A blank label falls back to the default —
 * a field with no label is a broken screen, not a choice.
 */
export function coerceParticipantDetails(value: unknown): ParticipantDetails {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const email =
    raw.email && typeof raw.email === "object"
      ? (raw.email as Record<string, unknown>)
      : {};
  const fallback = DEFAULT_PARTICIPANT_DETAILS.email;
  return {
    email: {
      enabled: email.enabled === true,
      label: clean(email.label, MAX_LABEL_LENGTH) || fallback.label,
      placeholder: clean(email.placeholder, MAX_PLACEHOLDER_LENGTH),
      required: email.required === true,
    },
  };
}

/**
 * The email question as the participant page should ask it, or null when it
 * should not be asked: switched off, or the tenant's database predates the
 * table the answer goes to. A project re-pointed at an older database must lose
 * the field rather than gain a save button that throws.
 */
export function askedEmail(
  details: ParticipantDetails,
  schemaVersion: number | null | undefined,
): EmailQuestion | null {
  if (!details.email.enabled) return null;
  if ((schemaVersion ?? 0) < CONTACTS_SCHEMA_VERSION) return null;
  return details.email;
}

/** "email (optional)" until the tenant makes it required, then just "email". */
export function emailLabel(question: EmailQuestion, optionalMarker: string): string {
  return question.required
    ? question.label
    : `${question.label} ${optionalMarker}`.trim();
}

/**
 * Loose on purpose: one "@" with something either side and no spaces. The
 * browser's `type="email"` check runs first; this is the same rule the tenant
 * table's CHECK applies, so a value that passes here is never refused there.
 */
export function isPlausibleEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^@\s]+@[^@\s]+$/.test(value);
}
