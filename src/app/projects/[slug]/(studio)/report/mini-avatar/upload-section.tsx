"use client";

import { useActionState } from "react";
import {
  promoteMiniScript,
  uploadMiniScript,
  revertToMainScript,
  type MiniUploadState,
} from "./actions";

export type MiniVersion = {
  version: number;
  label: string | null;
  /** False for a version that switched back to the main script. */
  hasCode: boolean;
  createdAt: string;
};

const FILE_INPUT =
  "text-xs text-dim file:mr-3 file:border file:border-paper/20 file:bg-transparent file:px-2 file:py-1 file:text-xs file:text-paper";

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

  const active = versions[0];
  const usingMini = !!active?.hasCode;

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

        <div className="flex shrink-0 gap-4 text-xs">
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
                className="term-input border-b border-paper/20"
              />
            </label>
          </div>

          {state.error && (
            <p role="alert" className="text-xs text-red-400">
              {state.error}
            </p>
          )}

          {state.uploaded && (
            <p className="text-xs text-dim">uploaded v{state.uploaded.version}</p>
          )}

          {state.warnings && (
            <div className="flex flex-col gap-1 rounded border border-amber-500/40 p-3">
              <p className="text-xs text-amber-400">Uploaded, but worth a look:</p>
              <ul className="text-[11px] leading-relaxed text-amber-200/70">
                {state.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-baseline gap-6">
            <button
              type="submit"
              disabled={pending}
              className="text-sm text-paper underline underline-offset-4 disabled:text-dim"
            >
              {pending ? "uploading…" : "upload version"}
            </button>
            {usingMini && (
              <button
                type="submit"
                formAction={revertToMainScript}
                formNoValidate
                className="text-xs text-dim underline-offset-4 hover:text-paper hover:underline"
              >
                draw with the main script instead
              </button>
            )}
          </div>
        </form>
      )}

      {versions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs text-dim">history</h3>
          <ul className="flex flex-col gap-2 text-xs">
            {versions.map((v, i) => (
              <li
                key={v.version}
                className="flex items-baseline justify-between gap-4 border-b border-paper/10 pb-2"
              >
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
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
