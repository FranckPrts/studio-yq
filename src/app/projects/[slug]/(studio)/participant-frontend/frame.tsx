"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectLexicon, ProjectTheme } from "@/lib/theme/project-theme";
import type { ProjectCopy } from "@/lib/theme/project-copy";
import type {
  FromPreview,
  PreviewScreen,
  ToPreview,
} from "@/app/projects/[slug]/preview-frame/protocol";

/**
 * The real participant page, in an iframe so it lays itself out against a real
 * viewport: at desktop width it is the side-by-side layout, at phone width the
 * stacked one — and it is scaled down to fit its column rather than squeezed,
 * which would show neither.
 *
 * One frame, one screen; `PreviewPane` chooses which from its tabs. Messages
 * are matched on `event.source`, so the frame never reads another window's.
 */

export const DEVICES = {
  desktop: { width: 1024, height: 680 },
  phone: { width: 390, height: 760 },
} as const;
export type Device = keyof typeof DEVICES;

export type FrameInfo = { hasScript: boolean; hasQuestions: boolean };

export default function PreviewFrame({
  slug,
  theme,
  lexicon,
  copy,
  screen,
  device,
  onReady,
  onScreen,
}: {
  slug: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  screen: PreviewScreen;
  device: Device;
  onReady?: (info: FrameInfo) => void;
  /** The participant moved to another screen by clicking inside the frame. */
  onScreen?: (screen: PreviewScreen) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);

  // Read by the message handler, which outlives any one render.
  const latest = useRef({ theme, lexicon, copy, screen, onReady, onScreen });
  useEffect(() => {
    latest.current = { theme, lexicon, copy, screen, onReady, onScreen };
  });

  function send(message: ToPreview) {
    frameRef.current?.contentWindow?.postMessage(
      message,
      window.location.origin,
    );
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as FromPreview;
      if (data?.type === "yq-preview:ready") {
        // Also on a reload of the frame: it starts from what is saved, so
        // bring it back to the drafts and the screen being looked at.
        const { theme, lexicon, copy, screen, onReady } = latest.current;
        send({ type: "yq-preview:draft", theme, lexicon, copy });
        send({ type: "yq-preview:show", screen });
        setReady(true);
        onReady?.({ hasScript: data.hasScript, hasQuestions: data.hasQuestions });
      } else if (data?.type === "yq-preview:screen") {
        latest.current.onScreen?.(data.screen);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready) send({ type: "yq-preview:draft", theme, lexicon, copy });
  }, [ready, theme, lexicon, copy]);

  useEffect(() => {
    if (ready) send({ type: "yq-preview:show", screen });
  }, [ready, screen]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const size = DEVICES[device];
  const scale = width ? Math.min(1, width / size.width) : 0;

  return (
    <div ref={boxRef} className="w-full">
      <div
        className="overflow-hidden border border-paper/10"
        style={{
          width: size.width * scale,
          height: size.height * scale,
          margin: device === "phone" ? "0 auto" : undefined,
        }}
      >
        <iframe
          ref={frameRef}
          src={`/projects/${slug}/preview-frame`}
          title="Participant page preview"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
