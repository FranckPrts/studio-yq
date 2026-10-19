"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass, cx } from "@/design";

/** A small "copy" button that puts `url` on the clipboard and says so for 2s. */
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

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy link"
      aria-label={copied ? "Link copied" : "Copy link"}
      className={cx(buttonClass("boxed", "xs"), "shrink-0 align-middle", className)}
    >
      <span aria-live="polite">{copied ? "copied ✓" : "copy"}</span>
    </button>
  );
}
