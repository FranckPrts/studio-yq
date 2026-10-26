"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass, cx } from "@/design";

/**
 * A small "copy" button that puts `url` on the clipboard and says so for 2s.
 *
 * The button keeps its label; "copied" appears beside it, never inside it —
 * status sits next to a button (`docs/participant-styling.md`). The live
 * region is always rendered, so a screen reader hears it when it fills.
 */
export default function CopyLinkButton({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  // One inline box, so a flex parent's gap counts it once whether or not the
  // status is showing.
  return (
    <span className={cx("inline-flex shrink-0 items-center align-middle", className)}>
      <button
        type="button"
        onClick={copy}
        title="Copy link"
        aria-label="Copy link"
        className={buttonClass("boxed", "xs")}
      >
        copy
      </button>
      <span aria-live="polite" className={cx("text-[11px] text-success", copied && "ml-2")}>
        {copied && "copied"}
      </span>
    </span>
  );
}
