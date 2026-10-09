"use client";

import { applyPreset, toStripOptions } from "@/lib/clean-options";
import { FORMAT_EXT, FORMAT_MIME } from "@/lib/detect";
import { downloadBlob } from "@/lib/download";
import { splitExt } from "@/lib/rename";
import { stripWorker } from "@/lib/workers";
import { transfer, useFiles, type FileEntry } from "./files";

/** The file shown by Inspect and Check: the active one, or the newest. */
export function useActiveFile(): FileEntry | undefined {
  return useFiles((s) => s.files.find((f) => f.id === s.activeId) ?? s.files[s.files.length - 1]);
}

/** One-click location removal (selective, in place). Downloads the result. */
export async function removeLocation(entry: FileEntry): Promise<{ edited: string[] }> {
  if (!entry.analysis) throw new Error("The file has not been scanned yet.");
  const { options } = toStripOptions({ preset: "custom", keepOrientation: true, custom: applyPreset("location") }, entry.analysis);
  const buf = await entry.file.arrayBuffer();
  const res = await stripWorker().call((api) => api.clean(transfer(buf), options));
  const [base, ext] = splitExt(entry.name);
  downloadBlob(new Blob([res.output], { type: FORMAT_MIME[entry.format] }), `${base}-no-location${ext || `.${FORMAT_EXT[entry.format]}`}`);
  return { edited: res.edited };
}

export const activateAndAdd = (files: File[]) => useFiles.getState().add(files, { activate: true });
