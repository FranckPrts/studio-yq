/**
 * What a project owner agrees to before any participant report is sent: that
 * sending passes participants' email addresses through studio-yq.
 *
 * Versioned. Changing the wording means bumping the version, and every project
 * then has to agree again before it can send — an agreement only counts for the
 * words that were actually shown.
 */

export const REPORT_NOTICE_VERSION = 1;

export const REPORT_NOTICE: string[] = [
  "To send participant reports, studio-yq reads each participant's email address from this project's Supabase database (the participant_contacts table) at the moment their email is sent, and hands it to Gmail, through the account connected below, to deliver.",
  "Addresses are held in memory only for that one send. studio-yq never stores them, never shows them in the studio, and never sends them to anyone's browser. The delivery log records participant IDs only.",
  "By agreeing, you confirm that participants gave their email address for receiving this report, and that you are entitled to process it this way under your study's consent and data-protection terms.",
];
