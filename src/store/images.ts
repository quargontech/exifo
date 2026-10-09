"use client";

import { create } from "zustand";
import { FORMAT_LABEL, FORMAT_MIME, type AnyImageFormat } from "@/lib/detect";
import { formatBytes } from "@/lib/format";
import { probe, uprightSize } from "@/lib/probe";
import { errorMessage, MAX_FILE_BYTES, MAX_FILES, type QueueNotice } from "./files";

/** Formats the image tools accept. TIFF and JPEG XL are not decodable in most browsers. */
export const IMAGE_TOOL_FORMATS: AnyImageFormat[] = ["jpeg", "png", "webp", "avif", "heic", "gif", "bmp"];

export interface ImageEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  format: AnyImageFormat;
  /** Object URL for previews (a converted PNG for HEIC once decoded). */
  url: string | null;
  /** Upright pixel size (orientation applied). */
  width: number;
  height: number;
  orientation: number;
  hasAlpha: boolean;
  dateTaken?: string;
  make?: string;
  model?: string;
  status: "ready" | "decoding" | "error";
  error?: string;
}

interface ImagesState {
  files: ImageEntry[];
  selectedId: string | null;
  notices: QueueNotice[];
  add: (files: File[]) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
  select: (id: string) => void;
  reorder: (ids: string[]) => void;
  dismissNotice: (id: string) => void;
}

let seq = 0;
const newId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Browsers that can show the original in an <img>. */
const previewable = (f: AnyImageFormat) => f !== "heic";

export const useImages = create<ImagesState>((set, get) => ({
  files: [],
  selectedId: null,
  notices: [],

  async add(incoming) {
    const notices: QueueNotice[] = [];
    const accepted: ImageEntry[] = [];
    let room = MAX_FILES - get().files.length;
    for (const file of incoming) {
      const name = file.name || `pasted-image-${seq + 1}.png`;
      if (file.size > MAX_FILE_BYTES) {
        notices.push({ id: newId(), tone: "warning", text: `${name} is ${formatBytes(file.size)}. The limit is 50 MB per file.` });
        continue;
      }
      if (room <= 0) {
        notices.push({ id: newId(), tone: "warning", text: `Only ${MAX_FILES} files can be processed at a time. ${name} was not added.` });
        continue;
      }
      const head = new Uint8Array(await file.slice(0, Math.min(file.size, 1 << 20)).arrayBuffer());
      const p = probe(head);
      if (!p || !IMAGE_TOOL_FORMATS.includes(p.format)) {
        notices.push({
          id: newId(),
          tone: "warning",
          text: p ? `${name} is ${FORMAT_LABEL[p.format]}, which browsers cannot open yet.` : `${name} is not a supported image.`,
        });
        continue;
      }
      const up = uprightSize(p);
      const named = file.name ? file : new File([file], name, { type: FORMAT_MIME[p.format], lastModified: file.lastModified });
      accepted.push({
        id: newId(),
        file: named,
        name,
        size: file.size,
        format: p.format,
        url: previewable(p.format) ? URL.createObjectURL(file) : null,
        width: up.width,
        height: up.height,
        orientation: p.orientation,
        hasAlpha: !!p.hasAlpha,
        dateTaken: p.dateTaken,
        make: p.make,
        model: p.model,
        status: "ready",
      });
      room--;
    }
    set((s) => ({
      files: [...s.files, ...accepted],
      notices: [...s.notices, ...notices].slice(-6),
      selectedId: s.selectedId ?? accepted[0]?.id ?? null,
    }));
  },

  remove(id) {
    const f = get().files.find((x) => x.id === id);
    if (f?.url) URL.revokeObjectURL(f.url);
    decoded.delete(id);
    set((s) => {
      const files = s.files.filter((x) => x.id !== id);
      return { files, selectedId: s.selectedId === id ? (files[0]?.id ?? null) : s.selectedId };
    });
  },

  clear() {
    for (const f of get().files) if (f.url) URL.revokeObjectURL(f.url);
    decoded.clear();
    set({ files: [], selectedId: null, notices: [] });
  },

  select(id) {
    set({ selectedId: id });
  },

  reorder(ids) {
    const byId = new Map(get().files.map((f) => [f.id, f]));
    set({ files: ids.map((id) => byId.get(id)!).filter(Boolean) });
  },

  dismissNotice(id) {
    set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
  },
}));

function patch(id: string, p: Partial<ImageEntry>) {
  useImages.setState((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...p } : f)) }));
}

/** HEIC files decoded once to a lossless PNG intermediate (browsers other than Safari cannot read HEIC). */
const decoded = new Map<string, Blob>();

async function decodeHeic(entry: ImageEntry): Promise<Blob> {
  const hit = decoded.get(entry.id);
  if (hit) return hit;
  patch(entry.id, { status: "decoding" });
  try {
    let out: Blob;
    try {
      // Safari decodes HEIC natively.
      const bmp = await createImageBitmap(entry.file);
      bmp.close();
      out = entry.file;
    } catch {
      const heic2any = (await import("heic2any")).default;
      const res = await heic2any({ blob: entry.file, toType: "image/png" });
      out = Array.isArray(res) ? res[0] : res;
    }
    decoded.set(entry.id, out);
    const bmp = await createImageBitmap(out);
    patch(entry.id, { status: "ready", url: URL.createObjectURL(out), width: bmp.width, height: bmp.height, orientation: 1 });
    bmp.close();
    return out;
  } catch (err) {
    patch(entry.id, { status: "error", error: `This HEIC file could not be decoded: ${errorMessage(err)}` });
    throw err;
  }
}

/** Bytes and MIME type the image worker can decode. */
export async function sourceFor(entry: ImageEntry): Promise<{ buffer: ArrayBuffer; mime: string }> {
  if (entry.format === "heic") {
    const blob = await decodeHeic(entry);
    return { buffer: await blob.arrayBuffer(), mime: blob.type || "image/png" };
  }
  return { buffer: await entry.file.arrayBuffer(), mime: FORMAT_MIME[entry.format] };
}

/** Preview URL, decoding HEIC on demand. */
export async function ensurePreview(entry: ImageEntry): Promise<string | null> {
  if (entry.url) return entry.url;
  if (entry.format === "heic") {
    await decodeHeic(entry).catch(() => null);
    return useImages.getState().files.find((f) => f.id === entry.id)?.url ?? null;
  }
  return null;
}
