"use client";

import { useActionState, useState } from "react";
import {
  deleteMiniScript,
  promoteMiniScript,
  uploadMiniScript,
  revertToMainScript,
  adoptStarterMini,
  type MiniUploadState,
} from "./actions";
import { buttonClass } from "@/design";
import StarterButton from "../../visual/starter-button";

export type MiniVersion = {
  version: number;
  label: string | null;
  /** False for a version that switched back to the main script. */
  hasCode: boolean;
  createdAt: string;
};

const FILE_INPUT =
  "text-xs text-dim file:mr-3 file:rounded file:border-0 file:bg-surface hover:file:bg-surface-hover file:px-2 file:py-1 file:text-xs file:text-paper";

export default function MiniUploadSection({
  slug,
  versions,
  canEdit,
  hasMainScript,
}: {
  slug: string;
  versions: MiniVersion[];
  canEdit: boolean;
  hasMainScript: boolean;
}) {
  const [state, action, pending] = useActionState<MiniUploadState, FormData>(
    uploadMiniScript,
    {},
  );

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const active = versions[0];
  const usingMini = !!active?.hasCode;

  const describe = (v: MiniVersion | undefined) =>
    !v || !v.hasCode
      ? "the main avatar"
      : `v${v.version} (${v.label ?? "mini-script"})`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="text-sm">
          {usingMini ? (
            <>
              Drawing with:{" "}
              <code className="text-paper/90">{active.label ?? "mini-script"}</code>{" "}
              <span className="text-dim">v{active.version}</span>
            </>
          ) : (
            <>
              Drawing with:{" "}
              <span className="text-paper/90">the main script, as it is</span>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-baseline gap-4 text-xs">
          {canEdit && usingMini && (
            <form action={revertToMainScript}>
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className="rounded bg-surface px-2 py-0.5 text-paper/90 hover:bg-surface-hover hover:text-paper"
              >
                reset to the main avatar
              </button>
            </form>
          )}
          {usingMini && (
            <a
              href={`/api/projects/${slug}/mini-script`}
              className="text-dim underline-offset-4 hover:text-paper hover:underline"
            >
              download this mini-script
            </a>
          )}
          <a
            href="/api/starter?file=mini"
            className="text-dim underline-offset-4 hover:text-paper hover:underline"
          >
            download a starter mini-script
          </a>
        </div>
      </div>

      {canEdit && !hasMainScript && (
        <p className="text-xs text-dim">
          Upload the main script first — a mini-avatar draws with its
          parameters.
        </p>
      )}

      {canEdit && hasMainScript && !usingMini && (
        <div className="flex flex-wrap items-center gap-3 rounded bg-surface p-3">
          <StarterButton
            slug={slug}
            action={adoptStarterMini}
            label="use the starter mini-script"
          />
          <p className="min-w-48 flex-1 text-[11px] leading-relaxed text-dim">
            The starter sketch&rsquo;s simplified companion. It reads the
            starter&rsquo;s parameters, so it fits best when the main script is
            the starter too.
          </p>
        </div>
      )}

      {canEdit && hasMainScript && (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-dim">mini-script (.js)</span>
              <input
                type="file"
                name="sketch"
                accept=".js,text/javascript"
                required
                className={FILE_INPUT}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-dim">label (optional)</span>
              <input
                name="label"
                placeholder="defaults to the file name"
                className="term-input rounded bg-surface px-2 py-1.5"
              />
            </label>
          </div>

          {state.error && (
            <p role="alert" className="text-xs text-danger">
              {state.error}
            </p>
          )}

          {state.uploaded && (
            <p className="text-xs text-dim">uploaded v{state.uploaded.version}</p>
          )}

          {state.warnings && (
            <div className="flex flex-col gap-1 rounded bg-warning-surface p-3">
              <p className="text-xs text-warning">Uploaded, but worth a look:</p>
              <ul className="text-[11px] leading-relaxed text-warning-strong/70">
                {state.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className={buttonClass("boxed")}
          >
            {pending ? "uploading…" : "upload version"}
          </button>
        </form>
      )}

      {versions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs text-dim">history</h3>
          <ul className="flex flex-col gap-2 text-xs">
            {versions.map((v, i) => (
              <li
                key={v.version}
                className="flex flex-col gap-2 border-b border-paper/10 pb-2"
              >
                <div className="flex items-baseline justify-between gap-4">
                <span className={i === 0 ? "" : "text-dim"}>
                  v{v.version} ·{" "}
                  {v.hasCode ? (v.label ?? "mini-script") : "back to the main script"}
                  {i === 0 && <span className="text-paper/60"> · active</span>}
                </span>
                <span className="flex shrink-0 items-baseline gap-3 text-dim">
                  <span>{v.createdAt}</span>
                  {v.hasCode && (
                    <a
                      href={`/api/projects/${slug}/mini-script?version=${v.version}`}
                      className="underline-offset-4 hover:text-paper hover:underline"
                    >
                      .js
                    </a>
                  )}
                  {canEdit && i !== 0 && v.hasCode && (
                    <form action={promoteMiniScript}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="version" value={v.version} />
                      <button
                        type="submit"
                        className="underline-offset-4 hover:text-paper hover:underline"
                      >
                        promote
                      </button>
                    </form>
                  )}
                  {canEdit && confirmDelete !== v.version && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(v.version)}
                      className="underline-offset-4 hover:text-danger-strong hover:underline"
                    >
                      delete
                    </button>
                  )}
                </span>
                </div>
                {canEdit && confirmDelete === v.version && (
                  <form
                    action={deleteMiniScript}
                    onSubmit={() => setConfirmDelete(null)}
                    className="flex flex-wrap items-baseline gap-4 rounded bg-danger-surface p-2"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="version" value={v.version} />
                    <span className="text-danger-strongest">
                      Delete v{v.version} for good?
                      {i === 0 &&
                        ` Reports will be drawn with ${describe(versions[1])} instead.`}
                    </span>
                    <button
                      type="submit"
                      className="text-danger-strongest underline underline-offset-4"
                    >
                      delete
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmDelete(null)}
                      className="text-dim hover:text-paper"
                    >
                      keep it
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
