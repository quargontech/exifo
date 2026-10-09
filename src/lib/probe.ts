/**
 * Fast header-only probe: pixel size, orientation and a few EXIF fields,
 * without decoding the image. Works for every format the image tools accept.
 */

import { ascii, bytesEqual, u16be, u16le, u24le, u32be, u32le } from "./bytes";
import { detectAnyFormat, type AnyImageFormat } from "./detect";
import { parseTiff, readOrientation, TiffReader, type TiffInfo } from "./tiff";

export interface ProbeResult {
  format: AnyImageFormat;
  /** Stored pixel size. */
  width: number;
  height: number;
  /** EXIF orientation (1–8). */
  orientation: number;
  dateTaken?: string;
  make?: string;
  model?: string;
  hasAlpha?: boolean;
}

function exifInJpeg(b: Uint8Array): { tiff: Uint8Array | null; width: number; height: number } {
  let p = 2;
  let tiff: Uint8Array | null = null;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) break;
    const m = b[p + 1];
    if (m === 0xff) {
      p++;
      continue;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      p += 2;
      continue;
    }
    const len = u16be(b, p + 2);
    if (m === 0xe1 && !tiff && bytesEqual(b, p + 4, "Exif\0")) tiff = b.subarray(p + 10, Math.min(b.length, p + 2 + len));
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { tiff, height: u16be(b, p + 5), width: u16be(b, p + 7) };
    }
    if (m === 0xda || m === 0xd9) break;
    p += 2 + len;
  }
  return { tiff, width: 0, height: 0 };
}

function readAscii(info: TiffInfo, b: Uint8Array, ifd: "ifd0" | "exif", tag: number): string | undefined {
  const e = info.ifds[ifd]?.entries.find((x) => x.tag === tag);
  if (!e || e.type !== 2 || e.valueOffset + e.size > b.length) return undefined;
  return (
    ascii(b, e.valueOffset, e.size)
      .replace(/\0[\s\S]*$/, "")
      .trim() || undefined
  );
}

function exifFields(tiff: Uint8Array | null) {
  if (!tiff) return {};
  const info = parseTiff(tiff);
  if (!info) return {};
  return {
    orientation: readOrientation(tiff),
    make: readAscii(info, tiff, "ifd0", 0x010f),
    model: readAscii(info, tiff, "ifd0", 0x0110),
    dateTaken: readAscii(info, tiff, "exif", 0x9003) ?? readAscii(info, tiff, "exif", 0x9004) ?? readAscii(info, tiff, "ifd0", 0x0132),
  };
}

/** ISO BMFF (HEIC / AVIF): size from the largest 'ispe' box, rotation from 'irot'. */
function bmffInfo(b: Uint8Array) {
  let width = 0;
  let height = 0;
  let rot = 0;
  const end = Math.min(b.length, 1 << 20);
  for (let i = 4; i + 16 < end; i++) {
    if (b[i] === 0x69 && bytesEqual(b, i, "ispe")) {
      const w = u32be(b, i + 8);
      const h = u32be(b, i + 12);
      if (w * h > width * height) {
        width = w;
        height = h;
      }
    } else if (b[i] === 0x69 && bytesEqual(b, i, "irot") && !rot) rot = b[i + 4] & 3;
  }
  return { width, height, orientation: rot === 1 ? 8 : rot === 2 ? 3 : rot === 3 ? 6 : 1 };
}

export function probe(b: Uint8Array): ProbeResult | null {
  const format = detectAnyFormat(b);
  if (!format) return null;
  const base: ProbeResult = { format, width: 0, height: 0, orientation: 1 };
  try {
    switch (format) {
      case "jpeg": {
        const j = exifInJpeg(b);
        return { ...base, width: j.width, height: j.height, ...exifFields(j.tiff) };
      }
      case "png": {
        const colorType = b[25];
        let tiff: Uint8Array | null = null;
        let hasAlpha = colorType === 4 || colorType === 6;
        for (let p = 8; p + 12 <= b.length;) {
          const len = u32be(b, p);
          const type = ascii(b, p + 4, 4);
          if (type === "eXIf") tiff = b.subarray(p + 8, p + 8 + len);
          if (type === "tRNS") hasAlpha = true;
          if (type === "IDAT" || type === "IEND") break;
          p += 12 + len;
        }
        return { ...base, width: u32be(b, 16), height: u32be(b, 20), hasAlpha, ...exifFields(tiff) };
      }
      case "webp": {
        let width = 0;
        let height = 0;
        let hasAlpha = false;
        let tiff: Uint8Array | null = null;
        for (let p = 12; p + 8 <= b.length;) {
          const id = ascii(b, p, 4);
          const size = u32le(b, p + 4);
          const d = p + 8;
          if (id === "VP8X") {
            hasAlpha = (b[d] & 0x10) !== 0;
            width = u24le(b, d + 4) + 1;
            height = u24le(b, d + 7) + 1;
          } else if (id === "VP8 " && !width) {
            width = u16le(b, d + 6) & 0x3fff;
            height = u16le(b, d + 8) & 0x3fff;
          } else if (id === "VP8L" && !width) {
            const bits = u32le(b, d + 1);
            width = (bits & 0x3fff) + 1;
            height = ((bits >>> 14) & 0x3fff) + 1;
            hasAlpha = ((bits >>> 28) & 1) === 1;
          } else if (id === "EXIF") {
            tiff = b.subarray(d, d + size);
            if (bytesEqual(tiff, 0, "Exif\0\0")) tiff = tiff.subarray(6);
          }
          p = d + size + (size & 1);
        }
        return { ...base, width, height, hasAlpha, ...exifFields(tiff) };
      }
      case "gif":
        return { ...base, width: u16le(b, 6), height: u16le(b, 8), hasAlpha: true };
      case "bmp": {
        const w = u32le(b, 18) | 0;
        const h = u32le(b, 22) | 0;
        return { ...base, width: Math.abs(w), height: Math.abs(h) };
      }
      case "heic":
      case "avif":
        return { ...base, ...bmffInfo(b), hasAlpha: format === "avif" };
      case "tiff": {
        const info = parseTiff(b);
        const r = new TiffReader(b, info?.le ?? true);
        const e = (tag: number) => info?.ifds.ifd0?.entries.find((x) => x.tag === tag);
        const v = (tag: number) => {
          const x = e(tag);
          return x ? (x.type === 3 ? r.u16(x.valueOffset) : r.u32(x.valueOffset)) : 0;
        };
        return { ...base, width: v(0x0100), height: v(0x0101), ...exifFields(b) };
      }
      default:
        return base;
    }
  } catch {
    return base;
  }
}

/** Upright size after applying the EXIF orientation. */
export const uprightSize = (p: { width: number; height: number; orientation: number }) =>
  p.orientation >= 5 ? { width: p.height, height: p.width } : { width: p.width, height: p.height };
