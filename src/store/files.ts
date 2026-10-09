"use client";

import * as Comlink from "comlink";
import { create } from "zustand";
import { detectAnyFormat, FORMAT_LABEL, type AnyImageFormat } from "@/lib/detect";
import { formatBytes } from "@/lib/format";
import type { Analysis } from "@/lib/report";
import type { Format } from "@/lib/types";
import { stripWorker } from "@/lib/workers";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES = 50;

export type ScanStatus = "queued" | "scanning" | "ready" | "error";

export interface FileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  format: Format;
  /** Object URL of the original, for the thumbnail. */
  url: string;
  status: ScanStatus;
  analysis?: Analysis;
  error?: string;
}

export interface QueueNotice {
  id: string;
  tone: "warning" | "error" | "info";
  text: string;
}

interface FilesState {
  files: FileEntry[];
  activeId: string | null;
  notices: QueueNotice[];
  add: (files: File[], opts?: { activate?: boolean; replace?: boolean }) => Promise<string[]>;
  remove: (id: string) => void;
  clear: () => void;
  setActive: (id: string | null) => void;
  dismissNotice: (id: string) => void;
}

let seq = 0;
const newId = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function sniff(file: File): Promise<AnyImageFormat | null> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  return detectAnyFormat(head);
}

export function rejectionText(name: string, fmt: AnyImageFormat | null): string {
  if (!fmt) return `${name} is not a supported image. Exifo cleans JPEG, PNG and WebP.`;
  if (fmt === "heic" || fmt === "avif")
    return `${name} is ${FORMAT_LABEL[fmt]}. Lossless cleaning for ${FORMAT_LABEL[fmt]} is not available yet; convert it to JPEG first.`;
  return `${name} is ${FORMAT_LABEL[fmt]}, which this tool does not support. Exifo cleans JPEG, PNG and WebP.`;
}

export const useFiles = create<FilesState>((set, get) => ({
  files: [],
  activeId: null,
  notices: [],

  async add(incoming, opts = {}) {
    const notices: QueueNotice[] = [];
    const accepted: FileEntry[] = [];
    if (opts.replace) get().clear();
    let room = MAX_FILES - get().files.length;
    for (const file of incoming) {
      const name = file.name || `pasted-image-${seq + 1}`;
      if (file.size > MAX_FILE_BYTES) {
        notices.push({ id: newId(), tone: "warning", text: `${name} is ${formatBytes(file.size)}. The limit is 50 MB per file.` });
        continue;
      }
      if (room <= 0) {
        notices.push({ id: newId(), tone: "warning", text: `Only ${MAX_FILES} files can be processed at a time. ${name} was not added.` });
        continue;
      }
      const fmt = await sniff(file).catch(() => null);
      if (fmt !== "jpeg" && fmt !== "png" && fmt !== "webp") {
        notices.push({ id: newId(), tone: "warning", text: rejectionText(name, fmt) });
        continue;
      }
      const named = file.name ? file : new File([file], name, { type: file.type, lastModified: file.lastModified });
      accepted.push({ id: newId(), file: named, name, size: file.size, format: fmt, url: URL.createObjectURL(file), status: "queued" });
      room--;
    }
    const ids = accepted.map((a) => a.id);
    set((s) => ({
      files: [...s.files, ...accepted],
      notices: [...s.notices, ...notices].slice(-6),
      activeId: opts.activate && ids.length ? ids[0] : (s.activeId ?? ids[0] ?? null),
    }));
    void pump();
    return ids;
  },

  remove(id) {
    const f = get().files.find((x) => x.id === id);
    if (f) URL.revokeObjectURL(f.url);
    set((s) => {
      const files = s.files.filter((x) => x.id !== id);
      return { files, activeId: s.activeId === id ? (files[files.length - 1]?.id ?? null) : s.activeId };
    });
  },

  clear() {
    for (const f of get().files) URL.revokeObjectURL(f.url);
    set({ files: [], activeId: null, notices: [] });
  },

  setActive(id) {
    set({ activeId: id });
  },

  dismissNotice(id) {
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
  },
}));

function patch(id: string, p: Partial<FileEntry>) {
  useFiles.setState((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...p } : f)) }));
}

export function errorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/^Error:\s*/, "") || "Something went wrong.";
}

let running = false;

/** Scan queued files one at a time (keeps memory low). */
async function pump() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const next = useFiles.getState().files.find((f) => f.status === "queued");
      if (!next) break;
      patch(next.id, { status: "scanning" });
      try {
        const buf = await next.file.arrayBuffer();
        const analysis = await stripWorker().call((api) => api.analyze(transfer(buf)));
        patch(next.id, { status: "ready", analysis });
      } catch (err) {
        patch(next.id, { status: "error", error: errorMessage(err) });
      }
    }
  } finally {
    running = false;
  }
}

export const transfer = (buf: ArrayBuffer) => Comlink.transfer(buf, [buf]);
