"use client";

import { useEffect } from "react";
import { useFiles } from "@/store/files";

export const SHARE_CACHE = "exifo-share-v1";

interface LaunchParams {
  files: { getFile(): Promise<File> }[];
}
declare global {
  interface Window {
    launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void };
  }
}

/** Reads files handed over by the OS share sheet (stored by the service worker). */
async function takeSharedFiles(): Promise<File[]> {
  if (!("caches" in window)) return [];
  const cache = await caches.open(SHARE_CACHE);
  const keys = await cache.keys();
  const files: File[] = [];
  for (const req of keys) {
    const res = await cache.match(req);
    if (res) {
      const blob = await res.blob();
      const name = decodeURIComponent(res.headers.get("x-file-name") || "shared-image");
      files.push(new File([blob], name, { type: blob.type, lastModified: Number(res.headers.get("x-last-modified")) || Date.now() }));
    }
    await cache.delete(req);
  }
  return files;
}

export function PwaClient() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.warn("Service worker not registered", err));
    }

    // "Open with Exifo" for installed desktop apps.
    window.launchQueue?.setConsumer(async (params) => {
      if (!params.files?.length) return;
      const files = await Promise.all(params.files.map((h) => h.getFile()));
      void useFiles.getState().add(files, { activate: true });
    });

    // Android share sheet.
    const url = new URL(window.location.href);
    if (url.searchParams.has("shared")) {
      url.searchParams.delete("shared");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      takeSharedFiles()
        .then((files) => {
          if (files.length) void useFiles.getState().add(files, { activate: true });
        })
        .catch(() => undefined);
    }
  }, []);
  return null;
}
