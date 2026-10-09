"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";
const KEY = "exifo-theme";

/** Inline script run before paint so the first frame has the right theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;

const listeners = new Set<() => void>();

function current(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode */
  }
  // Render synchronously so a view transition captures the finished page.
  flushSync(() => listeners.forEach((l) => l()));
}

/**
 * Switch theme. With `from` (a point on screen, usually the toggle) the new theme
 * spreads out in a circle from there; browsers without view transitions cross-fade.
 */
export function setTheme(t: Theme, from?: { x: number; y: number }) {
  const root = document.documentElement;
  if (!from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply(t);

  if (!document.startViewTransition) {
    root.classList.add("theme-fade");
    apply(t);
    window.setTimeout(() => root.classList.remove("theme-fade"), 450);
    return;
  }

  const { x, y } = from;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = document.startViewTransition(() => apply(t));
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {
      /* skipped, e.g. the tab was hidden; the theme is already applied */
    });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (saved !== "light" && saved !== "dark") {
      document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
      cb();
    }
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}
