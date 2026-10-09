"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { downloadBlob } from "@/lib/download";
import { makeZip } from "@/lib/zip";

export interface ToolResult<I = Record<string, unknown>> {
  status: "working" | "done" | "error";
  blob?: Blob;
  url?: string;
  name?: string;
  error?: string;
  info?: I;
  /** Settings fingerprint the result was made with. */
  key?: string;
}

export interface ResultsState<I> {
  results: Record<string, ToolResult<I>>;
  start: (id: string, key?: string) => void;
  succeed: (id: string, blob: Blob, name: string, info?: I, key?: string) => void;
  fail: (id: string, error: string) => void;
  reset: (id?: string) => void;
  keepOnly: (ids: string[]) => void;
  zip: (order: string[], zipName: string) => Promise<void>;
}

export type ResultsStore<I> = UseBoundStore<StoreApi<ResultsState<I>>>;

export function createResults<I = Record<string, unknown>>(): ResultsStore<I> {
  return create<ResultsState<I>>((set, get) => ({
    results: {},
    start(id, key) {
      const old = get().results[id];
      if (old?.url) URL.revokeObjectURL(old.url);
      set((s) => ({ results: { ...s.results, [id]: { status: "working", key } } }));
    },
    succeed(id, blob, name, info, key) {
      const old = get().results[id];
      if (old?.url) URL.revokeObjectURL(old.url);
      set((s) => ({ results: { ...s.results, [id]: { status: "done", blob, name, info, key, url: URL.createObjectURL(blob) } } }));
    },
    fail(id, error) {
      set((s) => ({ results: { ...s.results, [id]: { status: "error", error } } }));
    },
    reset(id) {
      const all = get().results;
      const ids = id ? [id] : Object.keys(all);
      for (const k of ids) if (all[k]?.url) URL.revokeObjectURL(all[k].url!);
      set({ results: id ? Object.fromEntries(Object.entries(all).filter(([k]) => k !== id)) : {} });
    },
    keepOnly(ids) {
      const keep = new Set(ids);
      const all = get().results;
      const stale = Object.keys(all).filter((k) => !keep.has(k));
      if (!stale.length) return;
      for (const k of stale) if (all[k]?.url) URL.revokeObjectURL(all[k].url!);
      set({ results: Object.fromEntries(Object.entries(all).filter(([k]) => keep.has(k))) });
    },
    async zip(order, zipName) {
      const all = get().results;
      const done = order.map((id) => all[id]).filter((r): r is ToolResult<I> => r?.status === "done" && !!r.blob && !!r.name);
      if (!done.length) return;
      const entries = await Promise.all(done.map(async (r) => ({ name: r.name!, data: new Uint8Array(await r.blob!.arrayBuffer()) })));
      downloadBlob(await makeZip(entries), zipName);
    },
  }));
}
