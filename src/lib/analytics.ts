"use client";

import { useSyncExternalStore } from "react";
import { ANALYTICS_ENABLED } from "@/lib/analytics-config";

/**
 * Google Analytics 4, loaded only after the visitor allows it.
 * Set NEXT_PUBLIC_GA_ID (for example G-ABC123XYZ) at build time; without it nothing is loaded
 * and no consent banner is shown. The ID is inlined into the static export.
 */
export const GA_ID = ANALYTICS_ENABLED ? process.env.NEXT_PUBLIC_GA_ID!.trim().toUpperCase() : "";

export type Consent = "granted" | "denied";
/** `unset` = not answered yet; `asking` = the banner was reopened from the footer. */
type State = Consent | "unset" | "asking";

const KEY = "exifo-analytics";
const listeners = new Set<() => void>();
let asking = false;

function read(): Consent | "unset" {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

function snapshot(): State {
  return asking ? "asking" : read();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const emit = () => listeners.forEach((l) => l());

/** Consent state on the client; `null` during server rendering and hydration. */
export function useConsent(): State | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

type Gtag = (...args: unknown[]) => void;

export function setConsent(c: Consent) {
  const was = read();
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  asking = false;
  if (c === "denied" && was === "granted") optOut();
  if (c === "granted" && was === "denied") optIn();
  emit();
}

/** Show the banner again so the visitor can change their choice. */
export function reopenConsent() {
  asking = true;
  emit();
}

/** Close a reopened banner without changing the choice. */
export function closeConsent() {
  asking = false;
  emit();
}

/** The saved choice, ignoring whether the banner is open. */
export function savedConsent(): Consent | "unset" {
  return read();
}

/** Stop sending hits right away and remove the cookies GA set. */
function optOut() {
  const w = window as unknown as Record<string, unknown> & { gtag?: Gtag };
  w[`ga-disable-${GA_ID}`] = true;
  w.gtag?.("consent", "update", { analytics_storage: "denied" });
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
  }
}

/** Undo optOut() when gtag.js is already on the page; otherwise the loader adds it. */
function optIn() {
  const w = window as unknown as Record<string, unknown> & { gtag?: Gtag };
  w[`ga-disable-${GA_ID}`] = false;
  w.gtag?.("consent", "update", { analytics_storage: "granted" });
}

/** Inline bootstrap run before gtag.js: consent defaults with every advertising signal off. */
export function gtagBootstrap(id: string) {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());
gtag('config','${id}',{allow_google_signals:false,allow_ad_personalization_signals:false});`;
}
