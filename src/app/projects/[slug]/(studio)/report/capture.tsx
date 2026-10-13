"use client";

import { useEffect, useRef, useState } from "react";
import AvatarCanvas, { type SketchLog } from "@/components/AvatarCanvas";
import type { ParamValues } from "@/lib/params/coerce";
import {
  MINI_CAPTURE_FRAME,
  MINI_CAPTURE_TIMEOUT_MS,
  miniHost,
} from "@/lib/report/mini";

/**
 * Photographing mini-avatars, one after another, for every report page.
 *
 * One stage, used in turn: each subject mounts a fresh frame, runs to the
 * capture frame and hands back a PNG. Sequential on purpose — a live frame per
 * avatar would hit the browser's cap on WebGL contexts long before a room's
 * worth — and the stage must stay visible, because browsers stop animating
 * sandboxed frames that are hidden or scrolled far away.
 */

export type CaptureSubject = { id: string; name: string; params: ParamValues };
export type CaptureResult = { image: string } | { error: string };

/**
 * Pictures already taken, kept for the life of the tab so moving between the
 * mini-avatar page and the map does not photograph everyone again. Keyed by
 * script and values, so a new upload or an edited avatar is a miss.
 */
const taken = new Map<string, string>();
const cacheKey = (script: string, s: CaptureSubject) =>
  `${script}|${s.id}|${JSON.stringify(s.params)}`;

export function useCaptureQueue(subjects: CaptureSubject[], script: string) {
  const [results, setResults] = useState<Map<string, CaptureResult>>(new Map());
  // Bumped to throw everything away and photograph again.
  const [run, setRun] = useState(0);

  // A different script starts over. Adjusted during render rather than in an
  // effect, so stale pictures never show.
  const [forScript, setForScript] = useState(script);
  if (forScript !== script) {
    setForScript(script);
    setResults(new Map());
    setRun((n) => n + 1);
  }

  const resultOf = (s: CaptureSubject): CaptureResult | undefined => {
    const own = results.get(s.id);
    if (own) return own;
    const cached = taken.get(cacheKey(script, s));
    return cached ? { image: cached } : undefined;
  };

  const current = subjects.find((s) => !resultOf(s)) ?? null;
  const index = current ? subjects.indexOf(current) : subjects.length;

  function record(subject: CaptureSubject, result: CaptureResult) {
    if ("image" in result) taken.set(cacheKey(script, subject), result.image);
    setResults((prev) =>
      prev.has(subject.id) ? prev : new Map(prev).set(subject.id, result),
    );
  }

  function restart() {
    for (const s of subjects) taken.delete(cacheKey(script, s));
    setResults(new Map());
    setRun((n) => n + 1);
  }

  return { resultOf, current, index, total: subjects.length, record, restart, run };
}

/**
 * The visible frame the queue photographs through. Gives up on a subject after
 * a timeout, reporting the first error the sketch logged if there was one.
 */
export function CaptureStage({
  current,
  run,
  code,
  extensions,
  ground,
  record,
  className = "",
}: {
  current: CaptureSubject | null;
  run: number;
  code: string;
  extensions: { url: string }[];
  ground: string;
  record: (subject: CaptureSubject, result: CaptureResult) => void;
  className?: string;
}) {
  const firstError = useRef<string | null>(null);
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  });

  useEffect(() => {
    if (!current) return;
    firstError.current = null;
    const timer = window.setTimeout(() => {
      recordRef.current(current, {
        error:
          firstError.current ??
          `Never reached frame ${MINI_CAPTURE_FRAME} — does it call noLoop()?`,
      });
    }, MINI_CAPTURE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [current, run]);

  function onLog(log: SketchLog) {
    if (log.type === "error" && !firstError.current) {
      firstError.current = log.message;
    }
  }

  return (
    <div
      className={`relative overflow-hidden border border-paper/10 ${className}`}
      style={{ background: ground }}
    >
      {current && (
        <AvatarCanvas
          key={`${run}:${current.id}`}
          code={code}
          extensions={extensions}
          params={current.params}
          host={miniHost(current.id)}
          onLog={onLog}
          capture={{
            afterFrame: MINI_CAPTURE_FRAME,
            onImage: (image) => recordRef.current(current, { image }),
          }}
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}
