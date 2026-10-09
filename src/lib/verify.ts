/**
 * Proof that cleaning did not touch the image:
 * 1. SHA-256 of the image-data bytes before and after (always run).
 * 2. Optional decoded-pixel comparison (user-triggered, browser only).
 */

import { toHex } from "./bytes";
import { imageDataRanges } from "./container";
import type { ByteRange } from "./types";

export async function sha256(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  return toHex(new Uint8Array(digest));
}

export function gather(b: Uint8Array, ranges: ByteRange[]): Uint8Array {
  const total = ranges.reduce((s, r) => s + r.size, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const r of ranges) {
    out.set(b.subarray(r.offset, r.offset + r.size), o);
    o += r.size;
  }
  return out;
}

/** Hex SHA-256 of the file's image data (format-specific ranges, see container.imageDataRanges). */
export async function imageDataHash(b: Uint8Array): Promise<string> {
  return sha256(gather(b, imageDataRanges(b)));
}

export async function verifyImageData(original: Uint8Array, output: Uint8Array): Promise<boolean> {
  const [a, c] = await Promise.all([imageDataHash(original), imageDataHash(output)]);
  return a === c;
}

export interface PixelCompareResult {
  identical: boolean;
  skipped?: string;
  differentPixels?: number;
  width?: number;
  height?: number;
}

const MAX_MEGAPIXELS = 40;

async function decode(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, {
      imageOrientation: "none" as ImageOrientation,
      colorSpaceConversion: "none",
      premultiplyAlpha: "none",
    });
  } catch {
    return createImageBitmap(blob);
  }
}

function pixels(bmp: ImageBitmap): Uint8ClampedArray {
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
}

/** Decode both files with the same options and compare every pixel. */
export async function comparePixels(a: Blob, b: Blob, knownWidth = 0, knownHeight = 0): Promise<PixelCompareResult> {
  if (knownWidth * knownHeight > MAX_MEGAPIXELS * 1e6) {
    return { identical: false, skipped: `Skipped: images above ${MAX_MEGAPIXELS} megapixels use too much memory to compare.` };
  }
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    return { identical: false, skipped: "Skipped: this browser cannot decode images here." };
  }
  const [x, y] = await Promise.all([decode(a), decode(b)]);
  try {
    if (x.width !== y.width || x.height !== y.height) {
      return { identical: false, width: x.width, height: x.height, differentPixels: -1 };
    }
    if (x.width * x.height > MAX_MEGAPIXELS * 1e6) {
      return { identical: false, skipped: `Skipped: images above ${MAX_MEGAPIXELS} megapixels use too much memory to compare.` };
    }
    const p = pixels(x);
    const q = pixels(y);
    let diff = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2] || p[i + 3] !== q[i + 3]) diff++;
    }
    return { identical: diff === 0, differentPixels: diff, width: x.width, height: x.height };
  } finally {
    x.close();
    y.close();
  }
}
