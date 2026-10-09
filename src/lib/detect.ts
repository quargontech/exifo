import { ascii, bytesEqual } from "./bytes";
import type { Format } from "./types";

/** Image formats Exifo recognises. Only `Format` (JPEG, PNG, WebP) can be cleaned losslessly. */
export type AnyImageFormat = Format | "heic" | "avif" | "gif" | "bmp" | "tiff" | "jxl";

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Detect a lossless-supported format by magic bytes. Never by file extension. */
export function detectFormat(b: Uint8Array): Format | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (bytesEqual(b, 0, PNG_SIG)) return "png";
  if (bytesEqual(b, 0, "RIFF") && bytesEqual(b, 8, "WEBP")) return "webp";
  return null;
}

/** Detect any image format Exifo can open in at least one tool. */
export function detectAnyFormat(b: Uint8Array): AnyImageFormat | null {
  const f = detectFormat(b);
  if (f) return f;
  if (bytesEqual(b, 0, "GIF87a") || bytesEqual(b, 0, "GIF89a")) return "gif";
  if (bytesEqual(b, 0, "BM") && b.length > 26) return "bmp";
  if (bytesEqual(b, 0, [0x49, 0x49, 0x2a, 0x00]) || bytesEqual(b, 0, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  if (bytesEqual(b, 0, [0xff, 0x0a]) || bytesEqual(b, 4, "JXL ")) return "jxl";
  if (bytesEqual(b, 4, "ftyp")) {
    const boxSize = (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
    const end = Math.min(b.length, Math.max(16, boxSize));
    const brands: string[] = [ascii(b, 8, 4)];
    for (let o = 16; o + 4 <= end; o += 4) brands.push(ascii(b, o, 4));
    if (brands.some((x) => x === "avif" || x === "avis")) return "avif";
    if (brands.some((x) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(x))) return "heic";
  }
  return null;
}

export const FORMAT_LABEL: Record<AnyImageFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  heic: "HEIC",
  avif: "AVIF",
  gif: "GIF",
  bmp: "BMP",
  tiff: "TIFF",
  jxl: "JPEG XL",
};

export const FORMAT_EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp" };
export const FORMAT_MIME: Record<AnyImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  avif: "image/avif",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  jxl: "image/jxl",
};
