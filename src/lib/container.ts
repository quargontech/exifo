/** Format dispatch for scan / strip / image-data ranges. */

import { detectFormat } from "./detect";
import { jpegImageRanges, scanJpeg, stripJpeg, type ContainerStrip } from "./jpeg";
import { pngImageRanges, scanPng, stripPng } from "./png";
import { scanWebp, stripWebp, webpImageRanges } from "./webp";
import { ExifoError, type ByteRange, type Format, type ScanResult, type StripOptions } from "./types";

export function requireFormat(b: Uint8Array): Format {
  const f = detectFormat(b);
  if (!f) throw new ExifoError("unsupported", "Format not supported in this version.");
  return f;
}

export function scan(b: Uint8Array): ScanResult {
  const f = requireFormat(b);
  return f === "jpeg" ? scanJpeg(b) : f === "png" ? scanPng(b) : scanWebp(b);
}

export function stripContainer(b: Uint8Array, opts: StripOptions): ContainerStrip {
  const f = requireFormat(b);
  return f === "jpeg" ? stripJpeg(b, opts) : f === "png" ? stripPng(b, opts) : stripWebp(b, opts);
}

export function imageDataRanges(b: Uint8Array): ByteRange[] {
  const f = requireFormat(b);
  return f === "jpeg" ? jpegImageRanges(b) : f === "png" ? pngImageRanges(b) : webpImageRanges(b);
}
