"use client";

import { useEffect, useState } from "react";
import { snapshotEmailImage } from "@/lib/report/email-images";
import type { EmailImage } from "@/lib/report/email-template";

/** The chosen snapshot as the studio pages are handed it. */
export type ReportSnapshot = { url: string; name: string; width: number; height: number };

/**
 * The project's chosen map snapshot as an email picture, for the {snapshot}
 * block. `ready` is true once it is loaded — or failed, or there is none — so
 * a send never waits on it forever, and never goes out before it.
 */
export function useSnapshotImage(snapshot: ReportSnapshot | null) {
  const url = snapshot?.url ?? null;
  const alt = snapshot ? "A map of everyone who took part" : "";
  const [state, setState] = useState<{ url: string | null; image: EmailImage | null }>({
    url: null,
    image: null,
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setState({ url, image: snapshotEmailImage(img, alt) });
    img.onerror = () => !cancelled && setState({ url, image: null });
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, alt]);

  if (!url) return { image: null, ready: true };
  return state.url === url ? { image: state.image, ready: true } : { image: null, ready: false };
}
