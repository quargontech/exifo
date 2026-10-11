"use client";

import { create } from "zustand";
import { DEFAULT_CLEAN_OPTIONS, toStripOptions, type CleanOptions } from "@/lib/clean-options";
import { FORMAT_EXT, FORMAT_MIME } from "@/lib/detect";
import { downloadBlob } from "@/lib/download";
import { splitExt } from "@/lib/rename";
import type { StripResult } from "@/lib/types";
import type { PixelCompareResult } from "@/lib/verify";
import { stripWorker } from "@/lib/workers";
import { makeZip } from "@/lib/zip";
import { errorMessage, transfer, useFiles, type FileEntry } from "./files";

export interface CleanResult extends Omit<StripResult, "output"> {
  blob: Blob;
  url: string;
  outName: string;
  notes: string[];
}

export interface CleanEntry {
  status: "cleaning" | "done" | "error";
  result?: CleanResult;
  error?: string;
  pixels?: { status: "running" | "done" | "error"; result?: PixelCompareResult; error?: string };
}

interface CleanState {
  options: CleanOptions;
  results: Record<string, CleanEntry>;
  busy: boolean;
  setOptions: (o: Partial<CleanOptions>) => void;
  cleanOne: (id: string) => Promise<void>;
  cleanAll: () => Promise<void>;
  comparePixels: (id: string) => Promise<void>;
  downloadZip: () => Promise<void>;
  /** Cleaned files in list order, for sharing or saving to a folder. */
  finishedFiles: () => { name: string; blob: Blob }[];
}

export const cleanName = (name: string, format: FileEntry["format"]) => {
  const [base, ext] = splitExt(name);
  return `${base}-clean${ext || `.${FORMAT_EXT[format]}`}`;
};

function revoke(e?: CleanEntry) {
  if (e?.result) URL.revokeObjectURL(e.result.url);
}

export const useClean = create<CleanState>((set, get) => ({
  options: DEFAULT_CLEAN_OPTIONS,
  results: {},
  busy: false,

  setOptions(o) {
    // Results were produced with the old options; discard them.
    Object.values(get().results).forEach(revoke);
    set((s) => ({ options: { ...s.options, ...o, custom: { ...s.options.custom, ...(o.custom ?? {}) } }, results: {} }));
  },

  async cleanOne(id) {
    const entry = useFiles.getState().files.find((f) => f.id === id);
    if (!entry || entry.status !== "ready" || !entry.analysis) return;
    if (get().results[id]?.status === "cleaning") return;
    revoke(get().results[id]);
    set((s) => ({ results: { ...s.results, [id]: { status: "cleaning" } } }));
    const startedWith = get().options;
    try {
      const { options, notes } = toStripOptions(startedWith, entry.analysis);
      const buf = await entry.file.arrayBuffer();
      const res = await stripWorker().call((api) => api.clean(transfer(buf), options));
      const blob = new Blob([res.output], { type: FORMAT_MIME[entry.format] });
      const { output: _output, ...rest } = res;
      void _output;
      const result: CleanResult = { ...rest, blob, url: URL.createObjectURL(blob), outName: cleanName(entry.name, entry.format), notes };
      // Discard if the file was removed or the options changed while cleaning.
      if (!useFiles.getState().files.some((f) => f.id === id) || get().options !== startedWith) {
        URL.revokeObjectURL(result.url);
        return;
      }
      set((s) => ({ results: { ...s.results, [id]: { status: "done", result } } }));
    } catch (err) {
      if (get().options === startedWith) set((s) => ({ results: { ...s.results, [id]: { status: "error", error: errorMessage(err) } } }));
    }
  },

  async cleanAll() {
    if (get().busy) return;
    set({ busy: true });
    try {
      for (;;) {
        const pending = useFiles.getState().files.find((f) => f.status === "ready" && !get().results[f.id] && f.analysis && hasRemovable(f));
        if (!pending) {
          // Wait for files still being scanned.
          if (useFiles.getState().files.some((f) => f.status === "queued" || f.status === "scanning")) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          break;
        }
        await get().cleanOne(pending.id);
      }
    } finally {
      set({ busy: false });
    }
  },

  async comparePixels(id) {
    const entry = useFiles.getState().files.find((f) => f.id === id);
    const done = get().results[id];
    if (!entry || !done?.result) return;
    const setPx = (p: CleanEntry["pixels"]) => set((s) => (s.results[id] ? { results: { ...s.results, [id]: { ...s.results[id], pixels: p } } } : s));
    setPx({ status: "running" });
    try {
      const [a, b] = await Promise.all([entry.file.arrayBuffer(), done.result.blob.arrayBuffer()]);
      const scan = entry.analysis!.scan;
      const result = await stripWorker().call((api) => api.comparePixels(transfer(a), transfer(b), FORMAT_MIME[entry.format], scan.width, scan.height));
      setPx({ status: "done", result });
    } catch (err) {
      setPx({ status: "error", error: errorMessage(err) });
    }
  },

  finishedFiles() {
    return useFiles.getState().files.flatMap((f) => {
      const r = get().results[f.id];
      return r?.status === "done" && r.result ? [{ name: r.result.outName, blob: r.result.blob }] : [];
    });
  },

  async downloadZip() {
    const files = useFiles.getState().files;
    const done = files.map((f) => ({ f, r: get().results[f.id] })).filter((x) => x.r?.status === "done" && x.r.result);
    if (!done.length) return;
    // One cleaned file downloads as itself; a ZIP is only for two or more.
    if (done.length === 1) return downloadBlob(done[0].r!.result!.blob, done[0].r!.result!.outName);
    const entries = await Promise.all(
      done.map(async ({ f, r }) => ({
        name: r!.result!.outName,
        data: new Uint8Array(await r!.result!.blob.arrayBuffer()),
        lastModified: f.file.lastModified,
      })),
    );
    downloadBlob(await makeZip(entries), "exifo-cleaned.zip");
  },
}));

/** Whether a scanned file has anything the current options would remove or change. */
export function hasRemovable(f: FileEntry): boolean {
  const a = f.analysis;
  if (!a) return false;
  const { options } = toStripOptions(useClean.getState().options, a);
  const kinds = new Set(options.remove);
  if (a.scan.blocks.some((b) => kinds.has(b.kind))) return true;
  if (options.xmp !== undefined) return true;
  const e = options.exifEdits;
  if (e && a.scan.blocks.some((b) => b.kind === "exif")) {
    if (e.gps && a.scan.hasGps) return true;
    if (e.thumbnail && a.scan.hasExifThumbnail) return true;
    if (e.device || e.dates) return true;
  }
  return false;
}

// Drop results (and their object URLs) for files removed from the queue.
useFiles.subscribe((s) => {
  const ids = new Set(s.files.map((f) => f.id));
  const results = useClean.getState().results;
  const stale = Object.keys(results).filter((id) => !ids.has(id));
  if (!stale.length) return;
  stale.forEach((id) => revoke(results[id]));
  useClean.setState({ results: Object.fromEntries(Object.entries(results).filter(([id]) => ids.has(id))) });
});
