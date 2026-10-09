/**
 * Lossless rotate and flip for JPEG by changing the EXIF orientation tag only.
 * The compressed image data is not touched.
 */

import { concat, setU16be } from "./bytes";
import { minimalOrientationApp1 } from "./exif-min";
import { buildJpegModel } from "./jpeg";
import { findEntry, parseTiff, TiffReader, type TiffInfo } from "./tiff";
import { ExifoError } from "./types";

type M = [number, number, number, number]; // [a, b, c, d] for [[a, b], [c, d]]

/** Display transform of each EXIF orientation (screen coordinates, y down). */
const ORIENT: Record<number, M> = {
  1: [1, 0, 0, 1],
  2: [-1, 0, 0, 1],
  3: [-1, 0, 0, -1],
  4: [1, 0, 0, -1],
  5: [0, 1, 1, 0],
  6: [0, -1, 1, 0],
  7: [0, -1, -1, 0],
  8: [0, 1, -1, 0],
};

const mul = (x: M, y: M): M => [x[0] * y[0] + x[1] * y[2], x[0] * y[1] + x[1] * y[3], x[2] * y[0] + x[3] * y[2], x[2] * y[1] + x[3] * y[3]];

const ROT: Record<number, M> = { 0: [1, 0, 0, 1], 90: [0, -1, 1, 0], 180: [-1, 0, 0, -1], 270: [0, 1, -1, 0] };

/**
 * Orientation after applying, to the displayed image, a horizontal / vertical flip
 * followed by a clockwise rotation (the same order the canvas pipeline uses).
 */
export function composeOrientation(current: number, rotate: 0 | 90 | 180 | 270, flipH = false, flipV = false): number {
  const flip: M = [flipH ? -1 : 1, 0, 0, flipV ? -1 : 1];
  const m = mul(mul(ROT[rotate], flip), ORIENT[current] ?? ORIENT[1]);
  for (const [o, t] of Object.entries(ORIENT)) if (t.every((v, i) => v === m[i])) return Number(o);
  return 1;
}

/** Copy of the TIFF block with an Orientation entry added to a new IFD0 appended at the end. */
function addOrientationEntry(tiff: Uint8Array, info: TiffInfo, orientation: number): Uint8Array {
  const ifd0 = info.ifds.ifd0!;
  const start = tiff.length + (tiff.length & 1);
  const n = ifd0.entries.length + 1;
  const out = new Uint8Array(start + 2 + n * 12 + 4);
  out.set(tiff);
  const r = new TiffReader(out, info.le);
  r.set16(start, n);
  const raw = ifd0.entries.map((e) => tiff.slice(e.entryOffset, e.entryOffset + 12));
  const entry = new Uint8Array(12);
  const er = new TiffReader(entry, info.le);
  er.set16(0, 0x0112);
  er.set16(2, 3);
  er.set32(4, 1);
  er.set16(8, orientation);
  const all = [...raw, entry].sort((a, b) => new TiffReader(a, info.le).u16(0) - new TiffReader(b, info.le).u16(0));
  all.forEach((e, i) => out.set(e, start + 2 + i * 12));
  r.set32(start + 2 + n * 12, ifd0.next);
  r.set32(4, start);
  return out;
}

export function setJpegOrientation(b: Uint8Array, orientation: number): Uint8Array {
  const model = buildJpegModel(b);
  const { segs } = model.parse;
  if (model.exifSeg >= 0) {
    const s = segs[model.exifSeg];
    const tiffStart = s.payloadStart + 6;
    const tiff = b.slice(tiffStart, s.end);
    const info = parseTiff(tiff);
    const e = info && findEntry(info, "ifd0", 0x0112);
    let newTiff: Uint8Array | null = null;
    if (info && e && e.type === 3 && e.inline) {
      new TiffReader(tiff, info.le).set16(e.valueOffset, orientation);
      newTiff = tiff;
    } else if (info?.ifds.ifd0) newTiff = addOrientationEntry(tiff, info, orientation);
    if (newTiff) {
      const head = b.slice(s.markerPos, tiffStart);
      const len = 2 + 6 + newTiff.length;
      if (len > 0xffff) throw new ExifoError("too-large", "The EXIF block is too large to update.");
      setU16be(head, 2, len);
      return concat([b.subarray(0, s.markerPos), head, newTiff, b.subarray(s.end)]);
    }
  }
  // No usable EXIF: insert the minimal orientation block after SOI / JFIF.
  let at = 2;
  if (segs[1]?.cls === "jfif") at = segs[1].end;
  return concat([b.subarray(0, at), minimalOrientationApp1(orientation), b.subarray(at)]);
}
