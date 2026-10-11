/**
 * WebP (RIFF) container. Metadata chunks are dropped, the VP8X flags are
 * updated to match, and the RIFF size is recalculated.
 */

import { ascii, bytesEqual, concat, fromAscii, setU24le, setU32le, u16le, u24le, u32le } from "./bytes";
import { editExif, hasAnyExifEdit } from "./exif-edit";
import { minimalOrientationTiff, needsOrientation } from "./exif-min";
import { hasGps, hasThumbnail, parseTiff, readOrientation } from "./tiff";
import { buildXmpWebpChunk, riffChunk } from "./xmp-write";
import { damaged, type BlockKind, type ByteRange, type MetaBlock, type ScanResult, type Segment, type StripOptions } from "./types";
import type { ContainerStrip } from "./jpeg";

export const VP8X_ICC = 0x20;
export const VP8X_ALPHA = 0x10;
export const VP8X_EXIF = 0x08;
export const VP8X_XMP = 0x04;
export const VP8X_ANIM = 0x02;

const KEEP = new Set(["VP8X", "ICCP", "ANIM", "ANMF", "ALPH", "VP8 ", "VP8L"]);
const IMAGE = new Set(["ANMF", "ALPH", "VP8 ", "VP8L"]);

export interface RiffChunk {
  fourcc: string;
  offset: number;
  size: number;
  dataStart: number;
  /** End including the padding byte. */
  end: number;
}

export interface WebpParse {
  chunks: RiffChunk[];
  riffEnd: number;
  extended: boolean;
}

export function parseWebp(b: Uint8Array): WebpParse {
  if (!bytesEqual(b, 0, "RIFF") || !bytesEqual(b, 8, "WEBP")) throw damaged("bad RIFF header");
  const riffSize = u32le(b, 4);
  const riffEnd = 8 + riffSize;
  if (riffSize < 4 || riffEnd > b.length) throw damaged("file is shorter than its header says");
  const chunks: RiffChunk[] = [];
  let p = 12;
  while (p < riffEnd) {
    if (p + 8 > riffEnd) throw damaged("chunk header runs past end of file");
    const fourcc = ascii(b, p, 4);
    const size = u32le(b, p + 4);
    const dataStart = p + 8;
    if (dataStart + size > riffEnd) throw damaged("chunk runs past end of file");
    const end = Math.min(riffEnd, dataStart + size + (size & 1));
    chunks.push({ fourcc, offset: p, size, dataStart, end });
    p = end;
  }
  if (!chunks.length || !["VP8 ", "VP8L", "VP8X"].includes(chunks[0].fourcc)) throw damaged("no WebP image data");
  return { chunks, riffEnd, extended: chunks[0].fourcc === "VP8X" };
}

export interface WebpModel {
  parse: WebpParse;
  blocks: MetaBlock[];
  chunkBlock: (string | undefined)[];
  trailerBlockId?: string;
  exifChunk: number;
  exifTiff: Uint8Array | null;
  orientation: number;
}

export function buildWebpModel(b: Uint8Array): WebpModel {
  const parse = parseWebp(b);
  const blocks: MetaBlock[] = [];
  const chunkBlock: (string | undefined)[] = new Array(parse.chunks.length);
  let exifChunk = -1;
  const add = (id: string, kind: BlockKind, label: string, short: string, c: { offset: number; end: number }, container: string) => {
    const blk: MetaBlock = {
      id,
      kind,
      label,
      short,
      container,
      offset: c.offset,
      size: c.end - c.offset,
      ranges: [{ offset: c.offset, size: c.end - c.offset }],
      aiSignals: [],
    };
    blocks.push(blk);
    return blk;
  };
  parse.chunks.forEach((c, i) => {
    if (KEEP.has(c.fourcc)) return;
    const name = c.fourcc.trim();
    let blk: MetaBlock;
    if (c.fourcc === "EXIF" && exifChunk < 0) {
      exifChunk = i;
      blk = add("exif", "exif", "EXIF", "EXIF", c, "EXIF chunk");
    } else if (c.fourcc === "XMP ") blk = add(blocks.some((x) => x.id === "xmp") ? `xmp-${i}` : "xmp", "xmp", "XMP", "XMP", c, "XMP chunk");
    else if (c.fourcc === "C2PA")
      blk = add(blocks.some((x) => x.id === "c2pa") ? `c2pa-${i}` : "c2pa", "c2pa", "Content Credentials (C2PA)", "C2PA", c, "C2PA chunk");
    else blk = add(`unknown-${i}`, c.fourcc === "EXIF" ? "exif" : "unknown", `Chunk ${name}`, name, c, `${name} chunk`);
    chunkBlock[i] = blk.id;
  });
  let trailerBlockId: string | undefined;
  if (parse.riffEnd < b.length) {
    trailerBlockId = add("trailer", "trailer", "Data after the RIFF container", "Trailing data", { offset: parse.riffEnd, end: b.length }, "after RIFF").id;
  }
  let exifTiff: Uint8Array | null = null;
  if (exifChunk >= 0) {
    const c = parse.chunks[exifChunk];
    exifTiff = b.subarray(c.dataStart, c.dataStart + c.size);
    if (bytesEqual(exifTiff, 0, "Exif\0\0")) exifTiff = exifTiff.subarray(6);
  }
  return {
    parse,
    blocks,
    chunkBlock,
    trailerBlockId,
    exifChunk,
    exifTiff,
    orientation: exifTiff ? readOrientation(exifTiff) : 1,
  };
}

/** Dimensions and alpha from the bitstream of a simple (non-VP8X) file. */
export function webpBitstreamInfo(b: Uint8Array, c: RiffChunk): { width: number; height: number; alpha: boolean } {
  const d = c.dataStart;
  if (c.fourcc === "VP8L" && b[d] === 0x2f) {
    const bits = u32le(b, d + 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: ((bits >>> 28) & 1) === 1 };
  }
  if (c.fourcc === "VP8 " && b[d + 3] === 0x9d && b[d + 4] === 0x01 && b[d + 5] === 0x2a) {
    return { width: u16le(b, d + 6) & 0x3fff, height: u16le(b, d + 8) & 0x3fff, alpha: false };
  }
  return { width: 0, height: 0, alpha: false };
}

export function scanWebp(b: Uint8Array): ScanResult {
  const model = buildWebpModel(b);
  const { chunks, extended } = model.parse;
  let width = 0;
  let height = 0;
  let animated = false;
  if (extended) {
    const x = chunks[0];
    width = u24le(b, x.dataStart + 4) + 1;
    height = u24le(b, x.dataStart + 7) + 1;
    animated = (b[x.dataStart] & VP8X_ANIM) !== 0 || chunks.some((c) => c.fourcc === "ANIM");
  } else ({ width, height } = webpBitstreamInfo(b, chunks[0]));

  const segments: Segment[] = [
    { name: "RIFF header", offset: 0, size: 12, role: "image" },
    ...chunks.map((c, i) => ({
      name: c.fourcc.trim(),
      offset: c.offset,
      size: c.end - c.offset,
      role: model.chunkBlock[i] ? ("meta" as const) : IMAGE.has(c.fourcc) ? ("image" as const) : ("render" as const),
      blockId: model.chunkBlock[i],
    })),
  ];
  if (model.trailerBlockId) {
    segments.push({ name: "Trailing data", offset: model.parse.riffEnd, size: b.length - model.parse.riffEnd, role: "meta", blockId: model.trailerBlockId });
  }
  const tiffInfo = model.exifTiff ? parseTiff(model.exifTiff) : null;
  return {
    format: "webp",
    width,
    height,
    orientation: model.orientation,
    hasIcc: chunks.some((c) => c.fourcc === "ICCP"),
    isAnimated: animated,
    blocks: model.blocks,
    segments,
    warnings: [],
    fileSize: b.length,
    hasGps: hasGps(tiffInfo),
    hasExifThumbnail: hasThumbnail(tiffInfo),
  };
}

export function stripWebp(b: Uint8Array, opts: StripOptions): ContainerStrip {
  const model = buildWebpModel(b);
  const { chunks, extended } = model.parse;
  const removeKinds = new Set<BlockKind>(opts.remove);
  const replaceXmp = typeof opts.xmp === "string";
  const edited: string[] = [];
  const removedIds = new Set<string>();
  for (const blk of model.blocks) {
    if (removeKinds.has(blk.kind) || (replaceXmp && blk.kind === "xmp")) removedIds.add(blk.id);
  }
  const exifEdits = { ...opts.exifEdits, thumbnail: !!opts.exifEdits?.thumbnail || removeKinds.has("thumbnail") };
  const exifKept = model.exifChunk >= 0 && !removedIds.has(model.chunkBlock[model.exifChunk]!);

  const extras: { fourcc: string; bytes: Uint8Array }[] = [];
  if (!exifKept && opts.keepOrientation && needsOrientation(model.orientation)) {
    extras.push({ fourcc: "EXIF", bytes: riffChunk("EXIF", minimalOrientationTiff(model.orientation)) });
  }
  if (replaceXmp && opts.xmp) extras.push({ fourcc: "XMP ", bytes: buildXmpWebpChunk(opts.xmp) });

  const out: { fourcc: string; bytes: Uint8Array }[] = [];
  const lastImage = chunks.reduce((acc, c, i) => (IMAGE.has(c.fourcc) ? i : acc), -1);
  chunks.forEach((c, i) => {
    const id = model.chunkBlock[i];
    if (!(id && removedIds.has(id))) {
      if (i === model.exifChunk && hasAnyExifEdit(exifEdits)) {
        const data = b.slice(c.dataStart, c.dataStart + c.size);
        const tiff = bytesEqual(data, 0, "Exif\0\0") ? data.subarray(6) : data;
        const done = editExif(tiff, exifEdits);
        if (done.length) {
          edited.push(...done);
          out.push({ fourcc: "EXIF", bytes: riffChunk("EXIF", data) });
        } else out.push({ fourcc: c.fourcc, bytes: b.subarray(c.offset, c.end) });
      } else out.push({ fourcc: c.fourcc, bytes: b.subarray(c.offset, c.end) });
    }
    if (i === lastImage) out.push(...extras);
  });
  if (lastImage < 0) out.push(...extras);
  // The container expects EXIF before XMP; a new XMP chunk can land ahead of a kept EXIF chunk.
  const exifAt = out.map((x) => x.fourcc).lastIndexOf("EXIF");
  const xmpAt = out.findIndex((x) => x.fourcc === "XMP ");
  if (xmpAt >= 0 && exifAt > xmpAt) out.splice(exifAt, 0, ...out.splice(xmpAt, 1));
  // A simple file must be extended before it can carry EXIF or XMP.
  const hasMeta = out.some((x) => x.fourcc === "EXIF" || x.fourcc === "XMP ");
  if (!extended && hasMeta) {
    const info = webpBitstreamInfo(b, chunks[0]);
    const vp8x = new Uint8Array(10);
    if (info.alpha) vp8x[0] |= VP8X_ALPHA;
    setU24le(vp8x, 4, Math.max(0, info.width - 1));
    setU24le(vp8x, 7, Math.max(0, info.height - 1));
    out.unshift({ fourcc: "VP8X", bytes: riffChunk("VP8X", vp8x) });
  }
  const vp8x = out.find((x) => x.fourcc === "VP8X");
  if (vp8x) {
    const copy = vp8x.bytes.slice();
    let flags = copy[8] & ~(VP8X_ICC | VP8X_EXIF | VP8X_XMP);
    if (out.some((x) => x.fourcc === "ICCP")) flags |= VP8X_ICC;
    if (out.some((x) => x.fourcc === "EXIF")) flags |= VP8X_EXIF;
    if (out.some((x) => x.fourcc === "XMP ")) flags |= VP8X_XMP;
    copy[8] = flags;
    vp8x.bytes = copy;
  }
  const header = new Uint8Array(12);
  header.set(fromAscii("RIFF"), 0);
  header.set(fromAscii("WEBP"), 8);
  const parts = [header, ...out.map((x) => x.bytes)];
  if (model.trailerBlockId && !removedIds.has(model.trailerBlockId)) parts.push(b.subarray(model.parse.riffEnd));
  const output = concat(parts);
  const riffLen = 12 + out.reduce((s, x) => s + x.bytes.length, 0);
  setU32le(output, 4, riffLen - 8);
  return { output, removedIds: [...removedIds], warnings: [], edited };
}

/** Image data for the identity hash: VP8, VP8L, ALPH and ANMF payloads. */
export function webpImageRanges(b: Uint8Array): ByteRange[] {
  return parseWebp(b)
    .chunks.filter((c) => IMAGE.has(c.fourcc))
    .map((c) => ({ offset: c.dataStart, size: c.size }));
}

export function webpPayloads(b: Uint8Array, model: WebpModel) {
  const get = (fourcc: string) => {
    const c = model.parse.chunks.find((x) => x.fourcc === fourcc);
    return c ? b.subarray(c.dataStart, c.dataStart + c.size) : null;
  };
  return { exif: model.exifTiff, xmp: get("XMP "), c2pa: get("C2PA"), icc: get("ICCP") };
}
