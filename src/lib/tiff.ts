/**
 * Minimal TIFF/EXIF structure reader. Used for orientation, GPS presence and
 * in-place field removal. Value interpretation for display is done by exifr.
 */

export type IfdName = "ifd0" | "exif" | "gps" | "interop" | "ifd1";

export interface TiffEntry {
  tag: number;
  type: number;
  count: number;
  /** Absolute offset (within the TIFF block) of this 12-byte entry. */
  entryOffset: number;
  /** Absolute offset of the value: inside the entry when it fits in 4 bytes, otherwise the pointed-to data. */
  valueOffset: number;
  /** Byte size of the value. */
  size: number;
  inline: boolean;
}

export interface TiffIfd {
  name: IfdName;
  offset: number;
  entries: TiffEntry[];
  /** Absolute offset of the 4-byte next-IFD pointer. */
  nextPtrOffset: number;
  next: number;
}

export interface TiffInfo {
  le: boolean;
  ifds: Partial<Record<IfdName, TiffIfd>>;
}

export const TYPE_SIZE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
  13: 4,
};

export const TAG = {
  Orientation: 0x0112,
  ExifIFD: 0x8769,
  GPSIFD: 0x8825,
  InteropIFD: 0xa005,
  JPEGInterchangeFormat: 0x0201,
  JPEGInterchangeFormatLength: 0x0202,
} as const;

export class TiffReader {
  constructor(
    public b: Uint8Array,
    public le: boolean,
  ) {}
  u16(o: number) {
    const b = this.b;
    return this.le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
  }
  u32(o: number) {
    const b = this.b;
    return this.le
      ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + ((b[o + 3] << 24) >>> 0)
      : ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
  }
  set16(o: number, v: number) {
    const b = this.b;
    if (this.le) {
      b[o] = v & 0xff;
      b[o + 1] = (v >>> 8) & 0xff;
    } else {
      b[o] = (v >>> 8) & 0xff;
      b[o + 1] = v & 0xff;
    }
  }
  set32(o: number, v: number) {
    const b = this.b;
    if (this.le) {
      b[o] = v & 0xff;
      b[o + 1] = (v >>> 8) & 0xff;
      b[o + 2] = (v >>> 16) & 0xff;
      b[o + 3] = (v >>> 24) & 0xff;
    } else {
      b[o] = (v >>> 24) & 0xff;
      b[o + 1] = (v >>> 16) & 0xff;
      b[o + 2] = (v >>> 8) & 0xff;
      b[o + 3] = v & 0xff;
    }
  }
}

/** Returns null when the bytes are not a TIFF header. */
export function tiffByteOrder(b: Uint8Array): boolean | null {
  if (b.length < 8) return null;
  if (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) return true;
  if (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a) return false;
  return null;
}

function readIfd(r: TiffReader, name: IfdName, offset: number): TiffIfd | null {
  const b = r.b;
  if (offset < 8 || offset + 2 > b.length) return null;
  const count = r.u16(offset);
  if (count > 1000) return null;
  const end = offset + 2 + count * 12;
  if (end + 4 > b.length) {
    // Tolerate a missing next-IFD pointer at the very end of the block.
    if (end > b.length) return null;
  }
  const entries: TiffEntry[] = [];
  for (let i = 0; i < count; i++) {
    const e = offset + 2 + i * 12;
    const tag = r.u16(e);
    const type = r.u16(e + 2);
    const cnt = r.u32(e + 4);
    const unit = TYPE_SIZE[type] ?? 1;
    const size = unit * cnt;
    const inline = size <= 4;
    const valueOffset = inline ? e + 8 : r.u32(e + 8);
    entries.push({ tag, type, count: cnt, entryOffset: e, valueOffset, size, inline });
  }
  const next = end + 4 <= b.length ? r.u32(end) : 0;
  return { name, offset, entries, nextPtrOffset: end, next };
}

/** Parse IFD0, the EXIF, GPS and Interop sub-IFDs, and IFD1. */
export function parseTiff(b: Uint8Array): TiffInfo | null {
  const le = tiffByteOrder(b);
  if (le === null) return null;
  const r = new TiffReader(b, le);
  const info: TiffInfo = { le, ifds: {} };
  const seen = new Set<number>();
  const load = (name: IfdName, off: number) => {
    if (!off || seen.has(off)) return null;
    seen.add(off);
    const ifd = readIfd(r, name, off);
    if (ifd) info.ifds[name] = ifd;
    return ifd;
  };
  const ifd0 = load("ifd0", r.u32(4));
  if (!ifd0) return info;
  const ptr = (ifd: TiffIfd, tag: number) => {
    const e = ifd.entries.find((x) => x.tag === tag);
    return e && (e.type === 4 || e.type === 13 || e.type === 3) ? (e.type === 3 ? r.u16(e.valueOffset) : r.u32(e.valueOffset)) : 0;
  };
  const exif = load("exif", ptr(ifd0, TAG.ExifIFD));
  load("gps", ptr(ifd0, TAG.GPSIFD));
  if (exif) load("interop", ptr(exif, TAG.InteropIFD));
  if (ifd0.next) load("ifd1", ifd0.next);
  return info;
}

export function findEntry(info: TiffInfo, ifd: IfdName, tag: number): TiffEntry | undefined {
  return info.ifds[ifd]?.entries.find((e) => e.tag === tag);
}

/** Orientation tag 0x0112 from IFD0, 1 when missing or out of range. */
export function readOrientation(b: Uint8Array): number {
  const info = parseTiff(b);
  if (!info) return 1;
  const e = findEntry(info, "ifd0", TAG.Orientation);
  if (!e || e.type !== 3) return 1;
  const v = new TiffReader(b, info.le).u16(e.valueOffset);
  return v >= 1 && v <= 8 ? v : 1;
}

export function hasGps(info: TiffInfo | null): boolean {
  return !!info?.ifds.gps && info.ifds.gps.entries.length > 0;
}

export function hasThumbnail(info: TiffInfo | null): boolean {
  const ifd1 = info?.ifds.ifd1;
  return !!ifd1 && ifd1.entries.some((e) => e.tag === TAG.JPEGInterchangeFormat || e.tag === 0x0111);
}
