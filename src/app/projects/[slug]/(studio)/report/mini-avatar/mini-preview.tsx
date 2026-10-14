"use client";

import { useEffect, useMemo, useState } from "react";
import { defaults, renderValues } from "@/lib/params/coerce";
import { miniSeed } from "@/lib/report/mini";
import type { Parameter } from "@/lib/params/types";
import {
  loadAvatars,
  roomClient,
  type RoomDatabase,
} from "@/lib/report/room";
import {
  CaptureStage,
  useCaptureQueue,
  type CaptureSubject,
} from "../capture";

/**
 * Real participants' mini-avatars, rendered the way a report will render them:
 * photographed one at a time through a visible stage, then shown as plain
 * images. See `../capture.tsx` for why it is sequential.
 */

/** How many to render before asking — enough to judge, quick to wait for. */
const FIRST_BATCH = 12;

export default function MiniPreview({
  code,
  extensions,
  source,
  scriptKey,
  parameters,
  ground,
  noun,
  database,
}: {
  code: string;
  extensions: { url: string }[];
  /** Which script `code` is, for the line that says so. */
  source: "mini" | "main";
  /** Identifies `code`, so pictures taken with it can be reused. */
  scriptKey: string;
  parameters: Parameter[];
  /** The project's background colour, which a report draws minis onto. */
  ground: string;
  noun: string;
  /** Null until the project's database is connected and provisioned. */
  database: RoomDatabase | null;
}) {
  const [avatars, setAvatars] = useState<CaptureSubject[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trial, setTrial] = useState<{ name: string; code: string; key: string } | null>(null);
  const [limit, setLimit] = useState(FIRST_BATCH);

  // The declaration's defaults stand in when there is nobody yet, and always
  // lead the grid as a reference point.
  const sample = useMemo<CaptureSubject>(
    () => ({
      id: "defaults",
      name: "parameter defaults",
      params: renderValues(parameters, defaults(parameters)),
    }),
    [parameters],
  );

  useEffect(() => {
    if (!database) return;
    let cancelled = false;
    loadAvatars(roomClient(database), parameters).then(
      (list) => !cancelled && setAvatars(list),
      (error: Error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setAvatars([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [database, parameters]);

  const subjects = useMemo(
    () => [sample, ...(avatars ?? []).slice(0, limit)],
    [sample, avatars, limit],
  );
  const queue = useCaptureQueue(
    subjects,
    trial?.key ?? scriptKey,
  );

  async function onTrialFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    // Keyed by content, so the same file reuses its pictures and a changed
    // one never does.
    setTrial({ name: file.name, code: text, key: `trial:${miniSeed(text)}:${text.length}` });
  }

  const remaining = (avatars?.length ?? 0) - limit;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-xs">
        <p className="text-dim">
          {trial ? (
            <>
              Trying <code className="text-paper/90">{trial.name}</code>, not
              uploaded.{" "}
              <button
                type="button"
                onClick={() => setTrial(null)}
                className="underline underline-offset-4 hover:text-paper"
              >
                back to the {source === "mini" ? "active mini-script" : "main script"}
              </button>
            </>
          ) : source === "mini" ? (
            "Rendered with the active mini-script."
          ) : (
            "No mini-script, so these are the main script, as it is."
          )}
        </p>
        <div className="flex shrink-0 items-baseline gap-4">
          <label className="cursor-pointer text-dim underline-offset-4 hover:text-paper hover:underline">
            try a file without uploading
            <input
              type="file"
              accept=".js,text/javascript"
              className="sr-only"
              onChange={(e) => {
                void onTrialFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={queue.restart}
            className="text-dim underline-offset-4 hover:text-paper hover:underline"
          >
            render again
          </button>
        </div>
      </div>

      {!database && (
        <p className="text-[11px] text-dim">
          The project&rsquo;s database isn&rsquo;t connected yet, so only the
          parameter defaults are shown.
        </p>
      )}
      {loadError && (
        <p role="alert" className="text-xs text-danger">
          Couldn&rsquo;t read the {noun} list: {loadError}
        </p>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <figure className="flex shrink-0 flex-col gap-2">
          <CaptureStage
            current={queue.current}
            run={queue.run}
            code={trial?.code ?? code}
            extensions={extensions}
            ground={ground}
            record={queue.record}
            displayPx={240}
          />
          <figcaption className="text-[11px] text-dim">
            {queue.current
              ? `rendering ${queue.index + 1} of ${queue.total}: ${queue.current.name}`
              : `${queue.total} rendered`}
          </figcaption>
        </figure>

        <ul className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
          {subjects.map((s) => {
            const r = queue.resultOf(s);
            return (
              <li key={s.id} className="flex flex-col gap-1">
                <div
                  className="flex aspect-square items-center justify-center overflow-hidden border border-paper/10"
                  style={{ background: ground }}
                >
                  {!r ? (
                    <span className="text-[10px] text-dim">waiting</span>
                  ) : "image" in r ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a data URL, nothing to optimise
                    <img src={r.image} alt={s.name} className="h-full w-full object-contain" />
                  ) : (
                    <span className="p-2 text-center text-[10px] leading-snug text-danger">
                      {r.error}
                    </span>
                  )}
                </div>
                <span
                  className={`truncate text-[11px] ${s.id === "defaults" ? "text-dim italic" : ""}`}
                  title={s.name}
                >
                  {s.name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {avatars && avatars.length === 0 && database && !loadError && (
        <p className="text-[11px] text-dim">
          No {noun} has been made yet. Participants&rsquo; will appear here.
        </p>
      )}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + remaining)}
          className="self-start text-xs text-dim underline underline-offset-4 hover:text-paper"
        >
          render the other {remaining}
        </button>
      )}
    </div>
  );
}
