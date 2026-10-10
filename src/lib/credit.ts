"use client";

import { useSyncExternalStore } from "react";

/**
 * The "Add Exifo credit" setting for the re-encoding image tools, shared across tools
 * and remembered in local storage. On by default; the output is still fully visible and
 * the credit (a small xmp:CreatorTool tag) shows up in Inspect.
 */
const KEY = "exifo-credit";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setCredit(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  listeners.forEach((l) => l());
}

/** `[on, setOn]`; defaults to on during SSR and before the first read. */
export function useCreditSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => true);
  return [on, setCredit];
}
