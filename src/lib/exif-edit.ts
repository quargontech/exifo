/**
 * In-place EXIF field removal (selective removal).
 *
 * An entry is removed from its IFD by shifting the later entries up, decreasing
 * the count and moving the next-IFD pointer; data it referenced is overwritten
 * with zeros. The block size never changes, so no offsets elsewhere move.
 */

import type { ExifEdits } from "./types";
import { TAG, TiffReader, parseTiff, type IfdName, type TiffIfd, type TiffInfo } from "./tiff";

const DEVICE_TAGS: [IfdName, number][] = [
  ["ifd0", 0x000b], // ProcessingSoftware
  ["ifd0", 0x010f], // Make
  ["ifd0", 0x0110], // Model
  ["ifd0", 0x0131], // Software
  ["ifd0", 0x013c], // HostComputer
  ["ifd0", 0xc614], // UniqueCameraModel
  ["ifd0", 0xc62f], // CameraSerialNumber
  ["exif", 0x927c], // MakerNote
  ["exif", 0xa430], // CameraOwnerName
  ["exif", 0xa431], // BodySerialNumber
  ["exif", 0xa432], // LensSpecification
  ["exif", 0xa433], // LensMake
  ["exif", 0xa434], // LensModel
  ["exif", 0xa435], // LensSerialNumber
];

const DATE_TAGS: [IfdName, number][] = [
  ["ifd0", 0x0132], // DateTime
  ["exif", 0x9003], // DateTimeOriginal
  ["exif", 0x9004], // DateTimeDigitized (CreateDate)
  ["exif", 0x9010], // OffsetTime
  ["exif", 0x9011], // OffsetTimeOriginal
  ["exif", 0x9012], // OffsetTimeDigitized
  ["exif", 0x9290], // SubSecTime
  ["exif", 0x9291], // SubSecTimeOriginal
  ["exif", 0x9292], // SubSecTimeDigitized
  ["gps", 0x0007], // GPSTimeStamp
  ["gps", 0x001d], // GPSDateStamp
];

const OWNER_TAGS: [IfdName, number][] = [
  ["ifd0", 0x013b], // Artist
  ["ifd0", 0x8298], // Copyright
];

function zeroRange(b: Uint8Array, start: number, size: number) {
  if (start < 8 || size <= 0) return;
  const end = Math.min(b.length, start + size);
  if (start < end) b.fill(0, start, end);
}

function zeroEntryData(b: Uint8Array, ifd: TiffIfd) {
  for (const e of ifd.entries) if (!e.inline) zeroRange(b, e.valueOffset, e.size);
}

function zeroIfd(b: Uint8Array, ifd: TiffIfd) {
  zeroEntryData(b, ifd);
  zeroRange(b, ifd.offset, 2 + ifd.entries.length * 12 + 4);
}

/** Remove one entry; returns true if something changed. Caller must re-parse afterwards. */
function removeEntry(b: Uint8Array, info: TiffInfo, ifdName: IfdName, tag: number): boolean {
  const ifd = info.ifds[ifdName];
  if (!ifd) return false;
  const idx = ifd.entries.findIndex((e) => e.tag === tag);
  if (idx < 0) return false;
  const r = new TiffReader(b, info.le);
  const e = ifd.entries[idx];
  if (!e.inline) zeroRange(b, e.valueOffset, e.size);
  const count = ifd.entries.length;
  const start = ifd.offset + 2 + idx * 12;
  const tableEnd = ifd.offset + 2 + count * 12;
  const ptrEnd = Math.min(b.length, tableEnd + 4);
  b.copyWithin(start, start + 12, ptrEnd);
  b.fill(0, ptrEnd - 12, ptrEnd);
  r.set16(ifd.offset, count - 1);
  return true;
}

function removeGps(b: Uint8Array): boolean {
  const info = parseTiff(b);
  if (!info) return false;
  const gps = info.ifds.gps;
  if (gps) zeroIfd(b, gps);
  const fresh = parseTiff(b) ?? info;
  return removeEntry(b, fresh, "ifd0", TAG.GPSIFD) || !!gps;
}

function removeThumbnail(b: Uint8Array): boolean {
  const info = parseTiff(b);
  const ifd1 = info?.ifds.ifd1;
  const ifd0 = info?.ifds.ifd0;
  if (!info || !ifd1 || !ifd0) return false;
  const r = new TiffReader(b, info.le);
  const read = (tag: number) => {
    const e = ifd1.entries.find((x) => x.tag === tag);
    if (!e) return 0;
    return e.type === 3 ? r.u16(e.valueOffset) : r.u32(e.valueOffset);
  };
  const thumbOffset = read(TAG.JPEGInterchangeFormat) || read(0x0111);
  const thumbLen = read(TAG.JPEGInterchangeFormatLength) || read(0x0117);
  zeroRange(b, thumbOffset, thumbLen);
  zeroIfd(b, ifd1);
  if (ifd0.nextPtrOffset + 4 <= b.length) r.set32(ifd0.nextPtrOffset, 0);
  return true;
}

function removeTags(b: Uint8Array, tags: [IfdName, number][]): boolean {
  let changed = false;
  for (const [ifd, tag] of tags) {
    const info = parseTiff(b);
    if (!info) break;
    if (removeEntry(b, info, ifd, tag)) changed = true;
  }
  return changed;
}

/**
 * Apply edits to a TIFF block in place (pass a copy). Returns labels for
 * what was actually removed. Never changes the block length.
 */
export function editExif(tiff: Uint8Array, edits: ExifEdits): string[] {
  const done: string[] = [];
  if (!parseTiff(tiff)) return done;
  if (edits.dates && removeTags(tiff, DATE_TAGS)) done.push("Dates");
  if (edits.gps && removeGps(tiff)) done.push("GPS location");
  if (edits.device && removeTags(tiff, DEVICE_TAGS)) done.push("Device details");
  if (edits.thumbnail && removeThumbnail(tiff)) done.push("EXIF thumbnail");
  if (edits.owner && removeTags(tiff, OWNER_TAGS)) done.push("Old EXIF creator and copyright");
  return done;
}

export const hasAnyExifEdit = (e?: ExifEdits) => !!e && !!(e.gps || e.device || e.dates || e.thumbnail || e.owner);
