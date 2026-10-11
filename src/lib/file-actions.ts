"use client";

/**
 * Ways to hand a finished file to the user besides a download: the phone share sheet,
 * the clipboard, and (desktop Chrome / Edge) writing straight into a folder.
 * Each one is offered only where the browser supports it; nothing leaves the device
 * except through the app or folder the user picks.
 */

import { splitExt } from "./rename";

export interface OutFile {
  name: string;
  blob: Blob;
}

const asFile = (f: OutFile) => new File([f.blob], f.name, { type: f.blob.type });

/** Phone or tablet that can share these files through the system share sheet. */
export function canShareFiles(files: OutFile[]): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare || !files.length) return false;
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: files.map(asFile) });
  } catch {
    return false;
  }
}

/** Opens the share sheet. Resolves false when the user closes it without sharing. */
export async function shareFiles(files: OutFile[]): Promise<boolean> {
  try {
    await navigator.share({ files: files.map(asFile) });
    return true;
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return false;
    throw err;
  }
}

export function canCopyImage(): boolean {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;
  const supports = (ClipboardItem as unknown as { supports?: (type: string) => boolean }).supports;
  return supports ? supports("image/png") : true;
}

/** Browsers only accept PNG images on the clipboard, so other formats are converted first. */
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bmp = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    bmp.close();
  }
}

export async function copyImage(blob: Blob): Promise<void> {
  // Passing the conversion as a promise keeps the click's permission to write (Safari needs this).
  await navigator.clipboard.write([new ClipboardItem({ "image/png": toPng(blob) })]);
}

interface DirectoryHandle {
  name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;
}
type DirectoryPicker = (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string }) => Promise<DirectoryHandle>;

export const canSaveToFolder = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

/** A name not taken in the folder: "photo.jpg", then "photo (1).jpg" and so on. Existing files are never overwritten. */
async function freeName(dir: DirectoryHandle, name: string): Promise<string> {
  const [base, ext] = splitExt(name);
  for (let i = 0; i < 1000; i++) {
    const candidate = i ? `${base} (${i})${ext}` : name;
    try {
      await dir.getFileHandle(candidate);
    } catch (err) {
      if ((err as DOMException)?.name === "NotFoundError") return candidate;
      throw err;
    }
  }
  return `${base}-${Date.now()}${ext}`;
}

/** Ask for a folder and write every file into it. Null when the user cancels the folder picker. */
export async function saveToFolder(files: OutFile[]): Promise<{ folder: string; saved: number } | null> {
  const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker;
  let dir: DirectoryHandle;
  try {
    dir = await picker({ id: "exifo-save", mode: "readwrite", startIn: "downloads" });
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return null;
    throw err;
  }
  let saved = 0;
  for (const f of files) {
    const handle = await dir.getFileHandle(await freeName(dir, f.name), { create: true });
    const writable = await handle.createWritable();
    await writable.write(f.blob);
    await writable.close();
    saved++;
  }
  return { folder: dir.name, saved };
}
