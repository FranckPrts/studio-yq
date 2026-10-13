import "server-only";
import { db } from "@/lib/db";

/**
 * Which script draws a project's mini-avatars.
 *
 * The newest MiniScript version wins, like the main script — unless it is a
 * null-code version, which records a switch back to the main script. With no
 * mini-script at all, the main script is used as it is.
 */

export type ReportScript = {
  /** Where the code came from, so the page can say which one is drawing. */
  source: "mini" | "main";
  code: string;
  /** The version of whichever script `source` names. */
  version: number;
  label: string | null;
  extensions: { url: string }[];
};

export async function reportScript(
  projectId: string,
): Promise<ReportScript | null> {
  const [mini, main] = await Promise.all([
    db.miniScript.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { code: true, version: true, label: true },
    }),
    db.avatarScript.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { code: true, version: true, label: true, extensions: true },
    }),
  ]);

  // Without a main script there is no declaration, so no values to draw with.
  if (!main) return null;
  const extensions = (main.extensions ?? []) as { url: string }[];

  if (mini?.code) {
    return {
      source: "mini",
      code: mini.code,
      version: mini.version,
      label: mini.label,
      extensions,
    };
  }
  return {
    source: "main",
    code: main.code,
    version: main.version,
    label: main.label,
    extensions,
  };
}
