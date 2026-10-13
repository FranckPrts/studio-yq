"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AvatarCanvas, { type SketchLog } from "@/components/AvatarCanvas";
import { defaults, renderValues, type ParamValues } from "@/lib/params/coerce";
import type { Parameter } from "@/lib/params/types";
import { normalizeAvatar, AVATARS_TABLE } from "@/lib/spoke/avatars";
import {
  MINI_CAPTURE_FRAME,
  MINI_CAPTURE_TIMEOUT_MS,
  miniHost,
} from "@/lib/report/mini";

/**
 * Real participants' mini-avatars, rendered the way a report will render them.
 *
 * One stage, used in turn: each avatar mounts a fresh frame, runs to the
 * capture frame and hands back a PNG, which the grid shows as a plain image.
 * Sequential on purpose — a live frame per tile would hit the browser's cap on
 * WebGL contexts long before a room's worth of avatars — and the stage stays
 * visible, because browsers stop animating sandboxed frames that are hidden.
 */

type Subject = { id: string; name: string; params: ParamValues };
type Result = { image: string } | { error: string };

/** How many to render before asking — enough to judge, quick to wait for. */
const FIRST_BATCH = 12;

export default function MiniPreview({
  code,
  extensions,
  source,
  parameters,
  ground,
  noun,
  database,
}: {
  code: string;
  extensions: { url: string }[];
  /** Which script `code` is, for the line that says so. */
  source: "mini" | "main";
  parameters: Parameter[];
  /** The project's background colour, which a report draws minis onto. */
  ground: string;
  noun: string;
  /** Null until the project's database is connected and provisioned. */
  database: { projectUrl: string; publishableKey: string } | null;
}) {
  const [avatars, setAvatars] = useState<Subject[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trial, setTrial] = useState<{ name: string; code: string } | null>(null);
  const [limit, setLimit] = useState(FIRST_BATCH);
  const [results, setResults] = useState<Map<string, Result>>(new Map());
  // Bumped to throw away every picture and render again.
  const [run, setRun] = useState(0);

  // A new upload arrives as a new `code` prop: start over with it. Adjusted
  // during render rather than in an effect, so the stale pictures never show.
  const [renderedCode, setRenderedCode] = useState(code);
  if (renderedCode !== code) {
    setRenderedCode(code);
    setResults(new Map());
    setRun((n) => n + 1);
  }

  // The declaration's defaults stand in when there is nobody yet, and always
  // lead the grid as a reference point.
  const sample = useMemo<Subject>(
    () => ({
      id: "defaults",
      name: "parameter defaults",
      params: renderValues(parameters, defaults(parameters)),
    }),
    [parameters],
  );

  useEffect(() => {
    if (!database) return;
    // No persisted session, as in the console: looking at the room must not
    // take out an anonymous participant identity in this browser.
    const client = createClient(database.projectUrl, database.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let cancelled = false;
    client
      .from(AVATARS_TABLE)
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          setAvatars([]);
          return;
        }
        setAvatars(
          (data ?? []).map((row) => {
            const a = normalizeAvatar(row, parameters);
            return {
              id: a.id,
              name: a.name || "(unnamed)",
              params: renderValues(parameters, a.params),
            };
          }),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [database, parameters]);

  const subjects = useMemo(
    () => [sample, ...(avatars ?? []).slice(0, limit)],
    [sample, avatars, limit],
  );
  const current = subjects.find((s) => !results.has(s.id)) ?? null;
  const index = current ? subjects.indexOf(current) : subjects.length;
  const activeCode = trial?.code ?? code;

  const record = (id: string, result: Result) =>
    setResults((prev) => (prev.has(id) ? prev : new Map(prev).set(id, result)));

  /** Throws the pictures away and starts the queue over. */
  function restart() {
    setResults(new Map());
    setRun((n) => n + 1);
  }

  // A sketch that errors or never reaches the frame still has to let the queue
  // move on. The first error it reported is the likeliest reason.
  const firstError = useRef<string | null>(null);
  useEffect(() => {
    if (!current) return;
    firstError.current = null;
    const id = current.id;
    const timer = window.setTimeout(() => {
      const error =
        firstError.current ??
        `Never reached frame ${MINI_CAPTURE_FRAME} — does it call noLoop()?`;
      setResults((prev) =>
        prev.has(id) ? prev : new Map(prev).set(id, { error }),
      );
    }, MINI_CAPTURE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [current, run]);

  function onLog(log: SketchLog) {
    if (log.type === "error" && !firstError.current) {
      firstError.current = log.message;
    }
  }

  async function onTrialFile(file: File | undefined) {
    if (!file) return;
    setTrial({ name: file.name, code: await file.text() });
    restart();
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
                onClick={() => {
                  setTrial(null);
                  restart();
                }}
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
            onClick={restart}
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
        <p role="alert" className="text-xs text-red-400">
          Couldn&rsquo;t read the {noun} list: {loadError}
        </p>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* The stage. Visible on purpose — see the comment at the top. */}
        <figure className="flex shrink-0 flex-col gap-2">
          <div
            className="relative h-60 w-60 overflow-hidden border border-paper/10"
            style={{ background: ground }}
          >
            {current && (
              <AvatarCanvas
                key={`${run}:${current.id}`}
                code={activeCode}
                extensions={extensions}
                params={current.params}
                host={miniHost(current.id)}
                onLog={onLog}
                capture={{
                  afterFrame: MINI_CAPTURE_FRAME,
                  onImage: (image) => record(current.id, { image }),
                }}
                className="absolute inset-0 h-full w-full"
              />
            )}
          </div>
          <figcaption className="text-[11px] text-dim">
            {current
              ? `rendering ${index + 1} of ${subjects.length}: ${current.name}`
              : `${subjects.length} rendered`}
          </figcaption>
        </figure>

        <ul className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
          {subjects.map((s) => {
            const r = results.get(s.id);
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
                    <span className="p-2 text-center text-[10px] leading-snug text-red-400">
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
