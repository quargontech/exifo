"use client";

import * as Comlink from "comlink";
import { useEffect, useRef, useState } from "react";
import { OUT_EXT, OUT_MIME, type OutFormat } from "@/lib/codecs";
import type { ProcessRequest, ProcessResult } from "@/lib/image-ops";
import { splitExt } from "@/lib/rename";
import { imageWorker } from "@/lib/image-worker";
import { errorMessage } from "@/store/files";
import { sourceFor, useImages, type ImageEntry } from "@/store/images";
import type { ResultsStore } from "@/store/results";

export type BuildRequest = (src: { buffer: ArrayBuffer; mime: string }, entry: ImageEntry) => ProcessRequest | Promise<ProcessRequest>;

export async function runJob(entry: ImageEntry, build: BuildRequest): Promise<ProcessResult> {
  const src = await sourceFor(entry);
  const req = await build(src, entry);
  const transfers: Transferable[] = [req.buffer];
  if (req.watermark?.logo) {
    req.watermark = { ...req.watermark, logo: req.watermark.logo.slice(0) };
    transfers.push(req.watermark.logo!);
  }
  return imageWorker().call((api) => api.process(Comlink.transfer(req, transfers)));
}

export const outName = (name: string, format: OutFormat, suffix: string) => {
  const [base, ext] = splitExt(name);
  const newExt = `.${OUT_EXT[format]}`;
  const sameExt = ext.toLowerCase() === newExt || (format === "jpeg" && /^\.jpe?g$/i.test(ext));
  return `${base}${suffix || sameExt ? suffix || "-converted" : ""}${newExt}`;
};

export interface PreviewState {
  status: "idle" | "working" | "done" | "error";
  url?: string;
  result?: ProcessResult;
  error?: string;
}

/** Re-run the job on the selected file whenever `key` changes (debounced), for a live preview. */
export function usePreview(entry: ImageEntry | undefined, key: string, build: BuildRequest, format: OutFormat, enabled = true, delay = 350): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const run = useRef(0);
  const urlRef = useRef<string | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  useEffect(() => {
    if (!entry || !enabled) {
      setState({ status: "idle" });
      return;
    }
    const n = ++run.current;
    setState((s) => ({ ...s, status: "working" }));
    const t = setTimeout(async () => {
      try {
        const result = await runJob(entry, buildRef.current);
        if (n !== run.current) return;
        const url = URL.createObjectURL(new Blob([result.output], { type: OUT_MIME[format] }));
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setState({ status: "done", url, result });
      } catch (err) {
        if (n === run.current) setState({ status: "error", error: errorMessage(err) });
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.status, key, enabled]);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  return state;
}

/** Process files one at a time into a results store. */
export async function runBatch<I>(
  store: ResultsStore<I>,
  files: ImageEntry[],
  key: string,
  fn: (f: ImageEntry) => Promise<{ blob: Blob; name: string; info?: I }>,
) {
  for (const f of files) {
    if (!useImages.getState().files.some((x) => x.id === f.id)) continue;
    store.getState().start(f.id, key);
    try {
      const r = await fn(f);
      store.getState().succeed(f.id, r.blob, r.name, r.info, key);
    } catch (err) {
      store.getState().fail(f.id, errorMessage(err));
    }
  }
}

/** Reset results when settings change, and drop results of removed files. */
export function useResultsHousekeeping<I>(store: ResultsStore<I>, key: string) {
  const files = useImages((s) => s.files);
  useEffect(() => {
    store.getState().reset();
  }, [key, store]);
  useEffect(() => {
    store.getState().keepOnly(files.map((f) => f.id));
  }, [files, store]);
}
