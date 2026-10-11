/**
 * PNG container: allowlist of chunks that affect rendering, everything else
 * ancillary is metadata. Whole chunks carry their own CRC, so removing one
 * needs no recalculation.
 */

import { ascii, bytesEqual, concat, indexOfZero, u32be } from "./bytes";
import { editExif, hasAnyExifEdit } from "./exif-edit";
import { minimalOrientationTiff, needsOrientation } from "./exif-min";
import { hasGps, hasThumbnail, parseTiff, readOrientation } from "./tiff";
import { buildXmpITXt, pngChunk } from "./xmp-write";
import { damaged, ExifoError, type BlockKind, type ByteRange, type MetaBlock, type ScanResult, type Segment, type StripOptions } from "./types";
import type { ContainerStrip } from "./jpeg";

export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const KEEP_CRITICAL = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);
const KEEP_RENDER = new Set(["tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "cICP", "mDCV", "cLLI", "sBIT", "bKGD", "pHYs", "hIST", "sPLT", "acTL", "fcTL", "fdAT"]);
const IMAGE_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "fdAT"]);

export interface PngChunk {
  type: string;
  offset: number;
  length: number;
  dataStart: number;
  end: number;
}

export interface PngParse {
  chunks: PngChunk[];
  iendEnd: number;
}

export function parsePng(b: Uint8Array): PngParse {
  if (!bytesEqual(b, 0, PNG_SIGNATURE)) throw damaged("bad PNG signature");
  const chunks: PngChunk[] = [];
  let p = 8;
  for (;;) {
    if (p + 12 > b.length) throw damaged("missing IEND chunk");
    const length = u32be(b, p);
    if (length > 0x7fffffff) throw damaged("invalid chunk length");
    const type = ascii(b, p + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type)) throw damaged(`invalid chunk type at offset ${p}`);
    const end = p + 12 + length;
    if (end > b.length) throw damaged("chunk runs past end of file");
    if (chunks.length === 0 && type !== "IHDR") throw damaged("first chunk is not IHDR");
    chunks.push({ type, offset: p, length, dataStart: p + 8, end });
    p = end;
    if (type === "IEND") break;
  }
  return { chunks, iendEnd: p };
}

const isCritical = (t: string) => t.charCodeAt(0) >= 65 && t.charCodeAt(0) <= 90;

export interface PngModel {
  parse: PngParse;
  blocks: MetaBlock[];
  chunkBlock: (string | undefined)[];
  trailerBlockId?: string;
  exifChunk: number;
  exifTiff: Uint8Array | null;
  orientation: number;
}

function itxtKeyword(b: Uint8Array, c: PngChunk): string {
  const z = indexOfZero(b, c.dataStart, c.dataStart + c.length);
  return z < 0 ? "" : ascii(b, c.dataStart, z - c.dataStart);
}

export function buildPngModel(b: Uint8Array): PngModel {
  const parse = parsePng(b);
  const blocks: MetaBlock[] = [];
  const byKey = new Map<string, MetaBlock>();
  const chunkBlock: (string | undefined)[] = new Array(parse.chunks.length);
  let exifChunk = -1;

  const add = (key: string, kind: BlockKind, label: string, short: string, container: string, r: ByteRange) => {
    let blk = byKey.get(key);
    if (!blk) {
      blk = { id: key, kind, label, short, container, offset: r.offset, size: 0, ranges: [], aiSignals: [] };
      byKey.set(key, blk);
      blocks.push(blk);
    } else if (!blk.container.split(", ").includes(container)) {
      blk.container += `, ${container}`;
    }
    blk.ranges.push(r);
    blk.size += r.size;
    return blk;
  };

  parse.chunks.forEach((c, i) => {
    const t = c.type;
    if (KEEP_CRITICAL.has(t) || KEEP_RENDER.has(t)) return;
    if (isCritical(t)) {
      throw new ExifoError("variant", `Unsupported PNG variant (unknown critical chunk "${t}").`);
    }
    const r = { offset: c.offset, size: c.end - c.offset };
    let blk: MetaBlock;
    if (t === "iTXt" && itxtKeyword(b, c) === "XML:com.adobe.xmp") blk = add("xmp", "xmp", "XMP", "XMP", "iTXt", r);
    else if (t === "tEXt" || t === "zTXt" || t === "iTXt") blk = add("text", "text", "Text chunks", "Text", t, r);
    else if (t === "eXIf") {
      if (exifChunk < 0) exifChunk = i;
      blk = add(exifChunk === i ? "exif" : `exif-${i}`, "exif", "EXIF", "EXIF", "eXIf", r);
    } else if (t === "caBX") blk = add("c2pa", "c2pa", "Content Credentials (C2PA)", "C2PA", "caBX", r);
    else if (t === "tIME") blk = add("unknown-time", "unknown", "Last-modified time (tIME)", "tIME", "tIME", r);
    else blk = add(`unknown-${i}`, "unknown", `Private chunk ${t}`, t, t, r);
    chunkBlock[i] = blk.id;
  });

  let trailerBlockId: string | undefined;
  if (parse.iendEnd < b.length) {
    trailerBlockId = add("trailer", "trailer", "Data after IEND", "Trailing data", "after IEND", {
      offset: parse.iendEnd,
      size: b.length - parse.iendEnd,
    }).id;
  }

  let exifTiff: Uint8Array | null = null;
  if (exifChunk >= 0) {
    const c = parse.chunks[exifChunk];
    exifTiff = b.subarray(c.dataStart, c.dataStart + c.length);
    // Some writers include the JPEG-style "Exif\0\0" prefix.
    if (bytesEqual(exifTiff, 0, "Exif\0\0")) exifTiff = exifTiff.subarray(6);
  }
  const orientation = exifTiff ? readOrientation(exifTiff) : 1;
  return { parse, blocks, chunkBlock, trailerBlockId, exifChunk, exifTiff, orientation };
}

export function scanPng(b: Uint8Array): ScanResult {
  const model = buildPngModel(b);
  const { chunks } = model.parse;
  const ihdr = chunks[0];
  const segments: Segment[] = chunks.map((c, i) => ({
    name: c.type,
    offset: c.offset,
    size: c.end - c.offset,
    role: model.chunkBlock[i] ? "meta" : IMAGE_CHUNKS.has(c.type) || c.type === "IEND" ? "image" : "render",
    blockId: model.chunkBlock[i],
  }));
  if (model.trailerBlockId) {
    segments.push({
      name: "Trailing data",
      offset: model.parse.iendEnd,
      size: b.length - model.parse.iendEnd,
      role: "meta",
      blockId: model.trailerBlockId,
    });
  }
  const tiffInfo = model.exifTiff ? parseTiff(model.exifTiff) : null;
  const isAnimated = chunks.some((c) => c.type === "acTL");
  return {
    format: "png",
    width: u32be(b, ihdr.dataStart),
    height: u32be(b, ihdr.dataStart + 4),
    orientation: model.orientation,
    hasIcc: chunks.some((c) => c.type === "iCCP"),
    isAnimated,
    blocks: model.blocks,
    segments,
    warnings: [],
    fileSize: b.length,
    hasGps: hasGps(tiffInfo),
    hasExifThumbnail: hasThumbnail(tiffInfo),
  };
}

/** Text-chunk keywords that hold a date or the creating software/device (PNG spec "Source" is the device). */
const DATE_KEYWORDS = /^(creation time|creation date|create date|modify date|date:create|date:modify|date:timestamp)$/i;
const DEVICE_KEYWORDS = /^(software|source)$/i;

export function stripPng(b: Uint8Array, opts: StripOptions): ContainerStrip {
  const model = buildPngModel(b);
  const removeKinds = new Set<BlockKind>(opts.remove);
  const replaceXmp = typeof opts.xmp === "string";
  const edited: string[] = [];
  const removedIds = new Set<string>();
  for (const blk of model.blocks) {
    if (removeKinds.has(blk.kind) || (replaceXmp && blk.kind === "xmp")) removedIds.add(blk.id);
  }
  const exifEdits = { ...opts.exifEdits, thumbnail: !!opts.exifEdits?.thumbnail || removeKinds.has("thumbnail") };
  const exifKept = model.exifChunk >= 0 && !removedIds.has(model.chunkBlock[model.exifChunk]!);

  // Selective removal also reaches the last-modified time and kept text chunks.
  const fe = opts.exifEdits;
  const textEdits = new Set<string>();
  const dropForEdit = (c: (typeof model.parse.chunks)[number]): boolean => {
    if (c.type === "tIME") return !!fe?.dates;
    if (c.type !== "tEXt" && c.type !== "zTXt" && c.type !== "iTXt") return false;
    const keyword = itxtKeyword(b, c);
    if (keyword === "XML:com.adobe.xmp") return false;
    if (fe?.dates && DATE_KEYWORDS.test(keyword)) return !!textEdits.add("Dates in PNG text");
    if (fe?.device && DEVICE_KEYWORDS.test(keyword)) return !!textEdits.add("Software in PNG text");
    return false;
  };

  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let xmpWritten = false;
  model.parse.chunks.forEach((c, i) => {
    const id = model.chunkBlock[i];
    if (id && removedIds.has(id)) return;
    if (dropForEdit(c)) {
      if (c.type === "tIME" && id) removedIds.add(id);
      return;
    }
    if (replaceXmp && opts.xmp && !xmpWritten && (c.type === "IDAT" || c.type === "fcTL" || c.type === "IEND")) {
      parts.push(buildXmpITXt(opts.xmp));
      xmpWritten = true;
    }
    if (i === model.exifChunk && exifKept && hasAnyExifEdit(exifEdits)) {
      const data = b.slice(c.dataStart, c.dataStart + c.length);
      const tiff = bytesEqual(data, 0, "Exif\0\0") ? data.subarray(6) : data;
      const done = editExif(tiff, exifEdits);
      if (done.length) {
        edited.push(...done);
        parts.push(pngChunk("eXIf", data));
        return;
      }
    }
    parts.push(b.subarray(c.offset, c.end));
    if (c.type === "IHDR" && !exifKept && opts.keepOrientation && needsOrientation(model.orientation)) {
      parts.push(pngChunk("eXIf", minimalOrientationTiff(model.orientation)));
    }
  });
  if (model.trailerBlockId && !removedIds.has(model.trailerBlockId)) parts.push(b.subarray(model.parse.iendEnd));
  edited.push(...textEdits);
  return { output: concat(parts), removedIds: [...removedIds], warnings: [], edited };
}

/** Image data for the identity hash: IHDR, PLTE, IDAT and fdAT chunks. */
export function pngImageRanges(b: Uint8Array): ByteRange[] {
  return parsePng(b)
    .chunks.filter((c) => IMAGE_CHUNKS.has(c.type))
    .map((c) => ({ offset: c.offset + 4, size: c.length + 4 }));
}

export interface PngPayloads {
  exif: Uint8Array | null;
  /** tEXt, zTXt and iTXt chunks (including the XMP iTXt), raw chunk data. */
  texts: { type: string; data: Uint8Array }[];
  c2pa: Uint8Array | null;
  iccp: Uint8Array | null;
  time: Uint8Array | null;
}

export function pngPayloads(b: Uint8Array, model: PngModel): PngPayloads {
  const out: PngPayloads = { exif: model.exifTiff, texts: [], c2pa: null, iccp: null, time: null };
  const c2pa: Uint8Array[] = [];
  for (const c of model.parse.chunks) {
    const data = b.subarray(c.dataStart, c.dataStart + c.length);
    if (c.type === "tEXt" || c.type === "zTXt" || c.type === "iTXt") out.texts.push({ type: c.type, data });
    else if (c.type === "caBX") c2pa.push(data);
    else if (c.type === "iCCP") out.iccp = data;
    else if (c.type === "tIME") out.time = data;
  }
  if (c2pa.length) out.c2pa = concat(c2pa);
  return out;
}
