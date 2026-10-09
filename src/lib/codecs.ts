/**
 * Lazy loaders for the WASM encoders and decoders. Each codec is only fetched
 * the first time a tool needs it. Runs inside the image worker.
 */

import type { AnyImageFormat } from "./detect";

export type OutFormat = "jpeg" | "webp" | "avif" | "png";

/** Output format for "Same as original": keep web formats, otherwise JPEG (or PNG / WebP when transparent). */
export function autoFormat(f: AnyImageFormat, hasAlpha: boolean): OutFormat {
  if (f === "jpeg" || f === "png" || f === "webp" || f === "avif") return f;
  if (f === "gif" || f === "bmp") return hasAlpha ? "png" : "jpeg";
  return hasAlpha ? "webp" : "jpeg";
}

export interface EncodeSettings {
  format: OutFormat;
  /** 1–100 for lossy formats. */
  quality: number;
  /** WebP and AVIF lossless; PNG is always lossless. */
  lossless?: boolean;
  /** Run OxiPNG on PNG output. */
  optimizePng?: boolean;
}

export const OUT_MIME: Record<OutFormat, string> = { jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", png: "image/png" };
export const OUT_EXT: Record<OutFormat, string> = { jpeg: "jpg", webp: "webp", avif: "avif", png: "png" };
export const OUT_LABEL: Record<OutFormat, string> = { jpeg: "JPEG", webp: "WebP", avif: "AVIF", png: "PNG" };
export const isLossy = (s: EncodeSettings) => s.format === "jpeg" || ((s.format === "webp" || s.format === "avif") && !s.lossless);

async function canvasEncode(img: ImageData, s: EncodeSettings): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.putImageData(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: OUT_MIME[s.format], quality: s.quality / 100 });
  if (blob.type !== OUT_MIME[s.format]) throw new Error(`This browser cannot write ${s.format.toUpperCase()}.`);
  return blob.arrayBuffer();
}

export async function encodeImage(img: ImageData, s: EncodeSettings): Promise<ArrayBuffer> {
  const q = Math.max(1, Math.min(100, Math.round(s.quality)));
  try {
    switch (s.format) {
      case "jpeg": {
        const m = await import("@jsquash/jpeg/encode");
        return await m.default(img, { quality: q, progressive: true, optimize_coding: true, trellis_multipass: q < 90 });
      }
      case "webp": {
        const m = await import("@jsquash/webp/encode");
        return await m.default(img, s.lossless ? { lossless: 1, quality: 100, method: 4, exact: 1 } : { quality: q, method: 4, use_sharp_yuv: 1 });
      }
      case "avif": {
        const m = await import("@jsquash/avif/encode");
        return await m.default(img, s.lossless ? { lossless: true, quality: 100, speed: 6 } : { quality: q, speed: 7 });
      }
      case "png": {
        const m = await import("@jsquash/png/encode");
        let buf = await m.default(img);
        if (s.optimizePng) {
          const ox = await import("@jsquash/oxipng/optimise");
          buf = await ox.default(buf, { level: 2, interlace: false });
        }
        return buf;
      }
    }
  } catch (err) {
    console.warn(`Exifo: ${s.format} WASM encoder unavailable, using the browser encoder`, err);
    return canvasEncode(img, { ...s, quality: q });
  }
}

/** Optimise an existing PNG file losslessly (no decode to canvas). */
export async function optimizePngFile(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const ox = await import("@jsquash/oxipng/optimise");
  return ox.default(buf, { level: 2, interlace: false });
}

/** Decode with the browser first; fall back to WASM decoders. EXIF orientation is applied. */
export async function decodeToBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // fall through
  }
  const buf = await blob.arrayBuffer();
  let data: ImageData | null = null;
  try {
    if (blob.type === "image/avif") data = await (await import("@jsquash/avif/decode")).default(buf);
    else if (blob.type === "image/webp") data = await (await import("@jsquash/webp/decode")).default(buf);
    else if (blob.type === "image/jpeg") data = await (await import("@jsquash/jpeg/decode")).default(buf);
    else if (blob.type === "image/png") data = await (await import("@jsquash/png/decode")).default(buf);
  } catch {
    data = null;
  }
  if (!data) throw new Error("This browser cannot decode this image.");
  return createImageBitmap(data);
}

/** High-quality resize (Lanczos3 in linear light). Falls back to canvas smoothing. */
export async function resizeImageData(img: ImageData, width: number, height: number): Promise<ImageData> {
  if (img.width === width && img.height === height) return img;
  try {
    const m = await import("@jsquash/resize");
    return await m.default(img, { width, height, method: "lanczos3", fitMethod: "stretch", premultiply: true, linearRGB: true });
  } catch (err) {
    console.warn("Exifo: WASM resize unavailable, using canvas", err);
    const src = new OffscreenCanvas(img.width, img.height);
    src.getContext("2d")!.putImageData(img, 0, 0);
    const dst = new OffscreenCanvas(width, height);
    const ctx = dst.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }
}
