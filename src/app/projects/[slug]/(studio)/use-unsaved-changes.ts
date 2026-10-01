"use client";

import { useEffect, useId } from "react";

/**
 * Asks before leaving a page with unsaved edits.
 *
 * Two exits need covering. Closing or reloading the tab is `beforeunload`,
 * where the browser shows its own wording. Following a link — the sidebar,
 * mostly — is a client-side navigation that never unloads anything, so a
 * capture-phase click listener on `window` gets there before `next/link`'s own
 * handler and cancels both the default and the router push if the answer is no.
 *
 * Every form on a page calls this, so the listeners are shared: one dirty form
 * or three, the question is asked once. The browser back button is not covered;
 * the App Router gives no way to cancel a popstate.
 */

const MESSAGE = "You have unsaved changes. Leave this page without saving them?";

const dirty = new Set<string>();

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  // Still required by some browsers to show the prompt at all.
  event.returnValue = "";
}

function onClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return;
  // A modified click opens a new tab and leaves this page alone.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== "_self") return;
  if (anchor.hasAttribute("download")) return;

  const url = new URL(anchor.href, window.location.href);
  // Downloads (`.zip` bundles) are served from /api and do not leave the page.
  if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) return;
  if (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return;
  }

  if (!window.confirm(MESSAGE)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function sync() {
  if (dirty.size > 0) {
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
  } else {
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.removeEventListener("click", onClick, true);
  }
}

export function useUnsavedChanges(isDirty: boolean) {
  const id = useId();
  useEffect(() => {
    if (!isDirty) return;
    dirty.add(id);
    sync();
    return () => {
      dirty.delete(id);
      sync();
    };
  }, [isDirty, id]);
}
