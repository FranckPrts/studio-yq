"use client";

import { useEffect, useRef, useState } from "react";
import AvatarCanvas, { type SketchLog } from "@/components/AvatarCanvas";
import type { ParamValues } from "@/lib/params/coerce";
import {
  MINI_CAPTURE_FRAME,
  MINI_CAPTURE_PX,
  MINI_CAPTURE_TIMEOUT_MS,
  miniHost,
  miniSeed,
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
  `${script}|${MINI_CAPTURE_PX}|${s.id}|${JSON.stringify(s.params)}`;

/** Identifies an avatar's values, so a saved picture of old values is a miss. */
const paramsHash = (s: CaptureSubject) => {
  const json = JSON.stringify(s.params);
  return `${miniSeed(json).toString(36)}.${json.length}`;
};

type Saved = Map<string, { paramsHash: string; url: string }>;

/**
 * Saving pictures to the project, so another visit, device or teammate does
 * not photograph everyone again. `null` keeps them to this tab, as for a
 * "try a file" trial.
 */
export type CapturePersistence = { slug: string } | null;

/** Set once the server says this person may not save — a viewer. */
let saveRefused = false;

const minisUrl = (slug: string) => `/api/projects/${encodeURIComponent(slug)}/report/minis`;

/**
 * A capture comes back as PNG; WebP is a fraction of the size for a picture
 * this soft. Browsers that cannot write WebP (Safari) hand back PNG, kept as is.
 */
async function compact(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  const webp = c.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") && webp.length < dataUrl.length ? webp : dataUrl;
}

async function save(slug: string, script: string, subject: CaptureSubject, image: string) {
  if (saveRefused) return;
  try {
    const res = await fetch(minisUrl(slug), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        avatarId: subject.id,
        paramsHash: paramsHash(subject),
        image: await compact(image),
      }),
    });
    if (res.status === 403) saveRefused = true;
  } catch {
    // Saving is a convenience: the picture is still on the page, and is taken
    // again next visit.
  }
}

export function useCaptureQueue(
  subjects: CaptureSubject[],
  script: string,
  persist: CapturePersistence = null,
) {
  const [results, setResults] = useState<Map<string, CaptureResult>>(new Map());
  // Bumped to throw everything away and photograph again.
  const [run, setRun] = useState(0);
  // Pictures saved to the project for this script. Null while being asked
  // for, so nobody is photographed who turns out to be saved already.
  const [saved, setSaved] = useState<Saved | null>(persist ? null : new Map());

  // A different script starts over. Adjusted during render rather than in an
  // effect, so stale pictures never show.
  const persistKey = persist ? `${persist.slug}|${script}` : null;
  const [forScript, setForScript] = useState({ script, persistKey });
  if (forScript.script !== script || forScript.persistKey !== persistKey) {
    setForScript({ script, persistKey });
    setResults(new Map());
    setSaved(persist ? null : new Map());
    setRun((n) => n + 1);
  }

  const slug = persist?.slug ?? null;
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`${minisUrl(slug)}?script=${encodeURIComponent(script)}`)
      .then((res) => (res.ok ? res.json() : { captures: [] }))
      .catch(() => ({ captures: [] }))
      .then((body: { captures: { avatarId: string; paramsHash: string; url: string }[] }) => {
        if (cancelled) return;
        setSaved(new Map(body.captures.map((c) => [c.avatarId, c])));
      });
    return () => {
      cancelled = true;
    };
  }, [slug, script]);

  const resultOf = (s: CaptureSubject): CaptureResult | undefined => {
    const own = results.get(s.id);
    if (own) return own;
    const cached = taken.get(cacheKey(script, s));
    if (cached) return { image: cached };
    const kept = saved?.get(s.id);
    return kept && kept.paramsHash === paramsHash(s) ? { image: kept.url } : undefined;
  };

  const current = saved ? (subjects.find((s) => !resultOf(s)) ?? null) : null;
  const index = current ? subjects.indexOf(current) : subjects.length;
  /** Still asking the server what is saved. */
  const checking = saved === null && subjects.length > 0;

  function record(subject: CaptureSubject, result: CaptureResult) {
    if ("image" in result) {
      taken.set(cacheKey(script, subject), result.image);
      if (slug) void save(slug, script, subject, result.image);
    }
    setResults((prev) =>
      prev.has(subject.id) ? prev : new Map(prev).set(subject.id, result),
    );
  }

  function restart() {
    for (const s of subjects) taken.delete(cacheKey(script, s));
    if (slug) {
      // Forget the saved ones here at once; delete them on the server too, if
      // allowed — a viewer's fresh pictures simply are not kept.
      setSaved((prev) => {
        if (!prev) return prev;
        const next = new Map(prev);
        for (const s of subjects) next.delete(s.id);
        return next;
      });
      if (!saveRefused) {
        const q = new URLSearchParams({ script });
        for (const s of subjects) q.append("avatar", s.id);
        void fetch(`${minisUrl(slug)}?${q}`, { method: "DELETE" }).catch(() => {});
      }
    }
    setResults(new Map());
    setRun((n) => n + 1);
  }

  return {
    resultOf,
    current,
    checking,
    index,
    total: subjects.length,
    record,
    restart,
    run,
  };
}

/**
 * The visible frame the queue photographs through. Gives up on a subject after
 * a timeout, reporting the first error the sketch logged if there was one.
 *
 * The sketch always runs in a frame of MINI_CAPTURE_PX square, shrunk with a
 * CSS transform to fit the box it is shown in — so the picture is the same
 * size and quality on every page. Shrunk, not hidden: it stays on screen,
 * which is what keeps the browser animating it.
 */
export function CaptureStage({
  current,
  run,
  code,
  extensions,
  ground,
  record,
  displayPx,
  className = "",
}: {
  current: CaptureSubject | null;
  run: number;
  code: string;
  extensions: { url: string }[];
  ground: string;
  record: (subject: CaptureSubject, result: CaptureResult) => void;
  /** How big the stage is shown, in CSS pixels. Does not change the picture. */
  displayPx: number;
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
      className={`relative shrink-0 overflow-hidden rounded bg-surface ${className}`}
      style={{ background: ground, width: displayPx, height: displayPx }}
    >
      {current && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: MINI_CAPTURE_PX,
            height: MINI_CAPTURE_PX,
            transform: `scale(${displayPx / MINI_CAPTURE_PX})`,
          }}
        >
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
            className="h-full w-full"
          />
        </div>
      )}
    </div>
  );
}
