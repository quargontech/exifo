/**
 * JPEG container: scan segments and rebuild the file without metadata.
 * Compressed image data is copied byte for byte; pixels are never decoded.
 */

import { bytesEqual, concat, fromAscii, identAt, setU16be, u16be, u32be } from "./bytes";
import { editExif, hasAnyExifEdit } from "./exif-edit";
import { minimalOrientationApp1, needsOrientation } from "./exif-min";
import { editIrb } from "./iptc";
import { hasGps, hasThumbnail, parseTiff, readOrientation } from "./tiff";
import { buildXmpApp1 } from "./xmp-write";
import { damaged, ExifoError, type BlockKind, type ByteRange, type MetaBlock, type ScanResult, type Segment, type StripOptions } from "./types";

export type JpegSegClass =
  | "soi"
  | "eoi"
  | "sos"
  | "image"
  | "standalone"
  | "jfif"
  | "jfxx"
  | "exif"
  | "xmp"
  | "xmpext"
  | "icc"
  | "mpf"
  | "c2pa"
  | "jumbf"
  | "iptc"
  | "adobe"
  | "app"
  | "com";

export interface JpegSeg {
  marker: number;
  /** Start of the segment, including any fill bytes before the marker. */
  offset: number;
  /** Position of the 0xFF that introduces the marker byte. */
  markerPos: number;
  /** Exclusive end. For SOS this includes the entropy-coded scan data. */
  end: number;
  cls: JpegSegClass;
  /** Start of the payload (after the 2-byte length). */
  payloadStart: number;
  ident: string;
}

export interface JpegParse {
  segs: JpegSeg[];
  firstSos: number;
  eoiIndex: number;
  eoiEnd: number;
  size: number;
}

const EXIF_ID = "Exif\0";
const XMP_ID = "http://ns.adobe.com/xap/1.0/\0";
const XMP_EXT_ID = "http://ns.adobe.com/xmp/extension/\0";
const ICC_ID = "ICC_PROFILE\0";
const MPF_ID = "MPF\0";
const PS_ID = "Photoshop 3.0\0";

const SOF_NAMES: Record<number, string> = {
  0xc0: "SOF0",
  0xc1: "SOF1",
  0xc2: "SOF2",
  0xc3: "SOF3",
  0xc5: "SOF5",
  0xc6: "SOF6",
  0xc7: "SOF7",
  0xc9: "SOF9",
  0xca: "SOF10",
  0xcb: "SOF11",
  0xcd: "SOF13",
  0xce: "SOF14",
  0xcf: "SOF15",
};

export function markerName(m: number): string {
  if (m === 0xd8) return "SOI";
  if (m === 0xd9) return "EOI";
  if (m === 0xda) return "SOS";
  if (m === 0xdb) return "DQT";
  if (m === 0xc4) return "DHT";
  if (m === 0xdd) return "DRI";
  if (m === 0xdc) return "DNL";
  if (m === 0xcc) return "DAC";
  if (m === 0xfe) return "COM";
  if (SOF_NAMES[m]) return SOF_NAMES[m];
  if (m >= 0xe0 && m <= 0xef) return `APP${m - 0xe0}`;
  if (m >= 0xd0 && m <= 0xd7) return `RST${m - 0xd0}`;
  return `0x${m.toString(16).toUpperCase()}`;
}

function classify(b: Uint8Array, m: number, p: number): JpegSegClass {
  if (m === 0xfe) return "com";
  if (m >= 0xe0 && m <= 0xef) {
    switch (m) {
      case 0xe0:
        if (bytesEqual(b, p, "JFIF\0")) return "jfif";
        if (bytesEqual(b, p, "JFXX\0")) return "jfxx";
        return "app";
      case 0xe1:
        if (bytesEqual(b, p, EXIF_ID)) return "exif";
        if (bytesEqual(b, p, XMP_ID)) return "xmp";
        if (bytesEqual(b, p, XMP_EXT_ID)) return "xmpext";
        return "app";
      case 0xe2:
        if (bytesEqual(b, p, ICC_ID)) return "icc";
        if (bytesEqual(b, p, MPF_ID)) return "mpf";
        return "app";
      case 0xeb:
        return bytesEqual(b, p, "JP") ? "jumbf" : "app";
      case 0xed:
        return bytesEqual(b, p, PS_ID) ? "iptc" : "app";
      case 0xee:
        return bytesEqual(b, p, "Adobe") ? "adobe" : "app";
      default:
        return "app";
    }
  }
  return "image";
}

/** Walk every segment. Throws when the file is truncated or corrupt. */
export function parseJpeg(b: Uint8Array): JpegParse {
  const n = b.length;
  if (n < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw damaged("no start-of-image marker");
  const segs: JpegSeg[] = [{ marker: 0xd8, offset: 0, markerPos: 0, end: 2, cls: "soi", payloadStart: 2, ident: "" }];
  let p = 2;
  let firstSos = -1;
  for (;;) {
    if (p >= n) throw damaged("missing end-of-image marker");
    if (b[p] !== 0xff) throw damaged(`unexpected byte at offset ${p}`);
    let q = p;
    while (q + 1 < n && b[q + 1] === 0xff) q++; // fill bytes
    if (q + 1 >= n) throw damaged("missing end-of-image marker");
    const m = b[q + 1];
    if (m === 0xd9) {
      segs.push({ marker: m, offset: p, markerPos: q, end: q + 2, cls: "eoi", payloadStart: q + 2, ident: "" });
      break;
    }
    if (m === 0xd8 || m === 0x00) throw damaged(`unexpected marker at offset ${q}`);
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      segs.push({ marker: m, offset: p, markerPos: q, end: q + 2, cls: "standalone", payloadStart: q + 2, ident: "" });
      p = q + 2;
      continue;
    }
    if (q + 4 > n) throw damaged("segment header runs past end of file");
    const len = u16be(b, q + 2);
    if (len < 2) throw damaged(`invalid segment length at offset ${q}`);
    const end = q + 2 + len;
    if (end > n) throw damaged("segment runs past end of file");
    const payloadStart = q + 4;
    if (m === 0xda) {
      // Entropy-coded data follows the SOS header and has no length field.
      let i = end;
      for (;;) {
        i = b.indexOf(0xff, i);
        if (i === -1 || i + 1 >= n) throw damaged("image data is incomplete");
        const nx = b[i + 1];
        if (nx === 0x00 || (nx >= 0xd0 && nx <= 0xd7)) {
          i += 2;
          continue;
        }
        if (nx === 0xff) {
          i += 1;
          continue;
        }
        break;
      }
      if (firstSos < 0) firstSos = segs.length;
      segs.push({ marker: m, offset: p, markerPos: q, end: i, cls: "sos", payloadStart, ident: "" });
      p = i;
      continue;
    }
    const cls = classify(b, m, payloadStart);
    const ident = cls === "app" || cls === "jumbf" ? identAt(b, payloadStart) : "";
    segs.push({ marker: m, offset: p, markerPos: q, end, cls, payloadStart, ident });
    p = end;
  }
  if (firstSos < 0) throw damaged("no image data");
  const eoiIndex = segs.length - 1;
  return { segs, firstSos, eoiIndex, eoiEnd: segs[eoiIndex].end, size: n };
}

/** C2PA manifests in JPEG are JUMBF boxes in APP11 whose description label is "c2pa". */
function isC2paJumbf(b: Uint8Array, s: JpegSeg): boolean {
  // CI "JP"(2) En(2) Z(4) LBox(4) TBox "jumb"(4) [XLBox(8)] then the jumd box.
  const p = s.payloadStart + 8;
  if (!bytesEqual(b, p + 4, "jumb")) return false;
  let d = p + 8;
  if (u32be(b, p) === 1) d += 8;
  if (!bytesEqual(b, d + 4, "jumd")) return false;
  const uuid = d + 8;
  if (bytesEqual(b, uuid, "c2pa")) return true;
  // label follows UUID(16) + toggles(1)
  return bytesEqual(b, uuid + 17, "c2pa");
}

export interface JpegModel {
  parse: JpegParse;
  blocks: MetaBlock[];
  /** Block id for each segment index, or undefined when the segment is kept. */
  segBlock: (string | undefined)[];
  trailerBlockId?: string;
  exifSeg: number;
  orientation: number;
  exifTiff: Uint8Array | null;
}

const KIND_INFO: Record<string, { kind: BlockKind; label: string; short: string; container: string }> = {
  exif: { kind: "exif", label: "EXIF", short: "EXIF", container: "APP1" },
  xmp: { kind: "xmp", label: "XMP", short: "XMP", container: "APP1" },
  c2pa: { kind: "c2pa", label: "Content Credentials (C2PA)", short: "C2PA", container: "APP11" },
  iptc: { kind: "iptc", label: "IPTC (Photoshop IRB)", short: "IPTC", container: "APP13" },
  comment: { kind: "comment", label: "Comment", short: "Comment", container: "COM" },
  thumbnail: { kind: "thumbnail", label: "JFIF thumbnail (JFXX)", short: "Thumbnail", container: "APP0" },
  mpf: { kind: "mpf", label: "Multi-picture index (MPF)", short: "MPF", container: "APP2" },
};

export function buildJpegModel(b: Uint8Array): JpegModel {
  const parse = parseJpeg(b);
  const { segs } = parse;
  const c2paInstances = new Set<number>();
  for (const s of segs) if (s.cls === "jumbf" && isC2paJumbf(b, s)) c2paInstances.add(u16be(b, s.payloadStart + 2));
  for (const s of segs) if (s.cls === "jumbf" && c2paInstances.has(u16be(b, s.payloadStart + 2))) s.cls = "c2pa";

  const blocks: MetaBlock[] = [];
  const byKey = new Map<string, MetaBlock>();
  const segBlock: (string | undefined)[] = new Array(segs.length);
  let exifSeg = -1;
  let unknownCount = 0;

  const add = (key: string, info: (typeof KIND_INFO)[string], range: ByteRange): MetaBlock => {
    let blk = byKey.get(key);
    if (!blk) {
      blk = { id: key, ...info, offset: range.offset, size: 0, ranges: [], aiSignals: [] };
      byKey.set(key, blk);
      blocks.push(blk);
    }
    blk.ranges.push(range);
    blk.size += range.size;
    return blk;
  };

  segs.forEach((s, i) => {
    const range = { offset: s.offset, size: s.end - s.offset };
    let blk: MetaBlock | undefined;
    switch (s.cls) {
      case "exif":
        if (exifSeg < 0) {
          exifSeg = i;
          blk = add("exif", KIND_INFO.exif, range);
        } else blk = add(`exif-${i}`, { ...KIND_INFO.exif, label: "Second EXIF block" }, range);
        break;
      case "xmp":
      case "xmpext":
        blk = add("xmp", KIND_INFO.xmp, range);
        if (s.cls === "xmpext") blk.label = "XMP (with extended XMP)";
        break;
      case "c2pa":
        blk = add("c2pa", KIND_INFO.c2pa, range);
        break;
      case "iptc":
        blk = add("iptc", KIND_INFO.iptc, range);
        break;
      case "com":
        blk = add("comment", KIND_INFO.comment, range);
        break;
      case "jfxx":
        blk = add("thumbnail", KIND_INFO.thumbnail, range);
        break;
      case "mpf":
        blk = add("mpf", KIND_INFO.mpf, range);
        break;
      case "app":
      case "jumbf": {
        const name = markerName(s.marker);
        blk = add(
          `unknown-${unknownCount++}`,
          {
            kind: "unknown",
            label: `${name}${s.ident ? ` ${s.ident}` : ""}${s.cls === "jumbf" ? " (JUMBF)" : ""}`,
            short: name,
            container: name,
          },
          range,
        );
        break;
      }
    }
    if (blk) segBlock[i] = blk.id;
  });

  let trailerBlockId: string | undefined;
  if (parse.eoiEnd < b.length) {
    const blk = add(
      "trailer",
      { kind: "trailer", label: "Data after end of image", short: "Trailing data", container: "after EOI" },
      { offset: parse.eoiEnd, size: b.length - parse.eoiEnd },
    );
    trailerBlockId = blk.id;
  }

  let exifTiff: Uint8Array | null = null;
  let orientation = 1;
  if (exifSeg >= 0) {
    const s = segs[exifSeg];
    exifTiff = b.subarray(s.payloadStart + 6, s.end);
    orientation = readOrientation(exifTiff);
  }
  return { parse, blocks, segBlock, trailerBlockId, exifSeg, orientation, exifTiff };
}

function segmentName(s: JpegSeg): string {
  switch (s.cls) {
    case "sos":
      return "SOS + scan data";
    case "jfif":
      return "APP0 JFIF";
    case "jfxx":
      return "APP0 JFXX thumbnail";
    case "exif":
      return "APP1 Exif";
    case "xmp":
      return "APP1 XMP";
    case "xmpext":
      return "APP1 Extended XMP";
    case "icc":
      return "APP2 ICC_PROFILE";
    case "mpf":
      return "APP2 MPF";
    case "c2pa":
      return "APP11 JUMBF (C2PA)";
    case "iptc":
      return "APP13 Photoshop IRB";
    case "adobe":
      return "APP14 Adobe";
    case "app":
    case "jumbf":
      return `${markerName(s.marker)}${s.ident ? ` ${s.ident}` : ""}`;
    default:
      return markerName(s.marker);
  }
}

const roleOf = (c: JpegSegClass) =>
  c === "jfif" || c === "icc" || c === "adobe"
    ? ("render" as const)
    : c === "soi" || c === "eoi" || c === "sos" || c === "image" || c === "standalone"
      ? ("image" as const)
      : ("meta" as const);

export function scanJpeg(b: Uint8Array): ScanResult {
  const model = buildJpegModel(b);
  const { segs } = model.parse;
  let width = 0;
  let height = 0;
  let adobeCmyk = false;
  for (const s of segs) {
    if (SOF_NAMES[s.marker] && !width) {
      height = u16be(b, s.payloadStart + 1);
      width = u16be(b, s.payloadStart + 3);
      if (b[s.payloadStart + 5] === 4) adobeCmyk = true;
    }
  }
  const segments: Segment[] = segs.map((s, i) => ({
    name: segmentName(s),
    offset: s.offset,
    size: s.end - s.offset,
    role: roleOf(s.cls),
    blockId: model.segBlock[i],
  }));
  if (model.trailerBlockId) {
    segments.push({
      name: "Trailing data",
      offset: model.parse.eoiEnd,
      size: b.length - model.parse.eoiEnd,
      role: "meta",
      blockId: model.trailerBlockId,
    });
  }
  const tiffInfo = model.exifTiff ? parseTiff(model.exifTiff) : null;
  const warnings: string[] = [];
  if (adobeCmyk) warnings.push("CMYK image. The Adobe colour-transform block is kept so colours stay correct.");
  return {
    format: "jpeg",
    width,
    height,
    orientation: model.orientation,
    hasIcc: segs.some((s) => s.cls === "icc"),
    isAnimated: false,
    blocks: model.blocks,
    segments,
    warnings,
    fileSize: b.length,
    hasGps: hasGps(tiffInfo),
    hasExifThumbnail: hasThumbnail(tiffInfo),
  };
}

export interface ContainerStrip {
  output: Uint8Array;
  removedIds: string[];
  warnings: string[];
  edited: string[];
}

type Piece = { seg?: number; bytes: Uint8Array };

export function stripJpeg(b: Uint8Array, opts: StripOptions): ContainerStrip {
  const model = buildJpegModel(b);
  const { segs, firstSos, eoiIndex } = model.parse;
  const removeKinds = new Set<BlockKind>(opts.remove);
  const replaceXmp = typeof opts.xmp === "string";
  const warnings: string[] = [];
  const edited: string[] = [];

  const blockById = new Map(model.blocks.map((x) => [x.id, x]));
  const removedIds = new Set<string>();
  for (const blk of model.blocks) {
    if (removeKinds.has(blk.kind) || (replaceXmp && blk.kind === "xmp")) removedIds.add(blk.id);
  }
  // MPF without its trailing images (or the reverse) is meaningless.
  const mpf = blockById.get("mpf");
  if (mpf && model.trailerBlockId) {
    if (removedIds.has(mpf.id) || removedIds.has(model.trailerBlockId)) {
      removedIds.add(mpf.id);
      removedIds.add(model.trailerBlockId);
    }
  } else if (mpf) {
    removedIds.add(mpf.id); // MPF pointing at images that are not there
  }

  const isRemoved = (i: number) => {
    const id = model.segBlock[i];
    return !!id && removedIds.has(id);
  };
  const replaced = new Map<number, Uint8Array>();
  const seg = (i: number): Piece => ({ seg: i, bytes: replaced.get(i) ?? b.subarray(segs[i].offset, segs[i].end) });

  // IPTC: remove location, device or date datasets in place when the block stays.
  const fe = opts.exifEdits;
  const iptcSegs = segs.map((_, i) => i).filter((i) => model.segBlock[i] === "iptc" && !isRemoved(i));
  if ((fe?.gps || fe?.device || fe?.dates) && iptcSegs.length === 1) {
    const s = segs[iptcSegs[0]];
    const res = editIrb(b.subarray(s.payloadStart + PS_ID.length, s.end), fe);
    if (res) {
      const body = concat([fromAscii(PS_ID), res.payload]);
      const app13 = new Uint8Array(4 + body.length);
      app13[0] = 0xff;
      app13[1] = 0xed;
      setU16be(app13, 2, 2 + body.length);
      app13.set(body, 4);
      replaced.set(iptcSegs[0], app13);
      edited.push(...res.done);
    }
  } else if ((fe?.gps || fe?.device || fe?.dates) && iptcSegs.length > 1) {
    warnings.push("The IPTC block in this file is split across several segments, so location, device and date fields inside it were left as they are.");
  }

  // EXIF: keep (optionally edited), or replace with the minimal orientation block.
  let exifPiece: Piece | null = null;
  const exifEdits = { ...opts.exifEdits, thumbnail: !!opts.exifEdits?.thumbnail || removeKinds.has("thumbnail") };
  if (model.exifSeg >= 0 && !isRemoved(model.exifSeg)) {
    exifPiece = seg(model.exifSeg);
    if (hasAnyExifEdit(exifEdits)) {
      const s = segs[model.exifSeg];
      const copy = b.slice(s.offset, s.end);
      const tiffStart = s.payloadStart + 6 - s.offset;
      const done = editExif(copy.subarray(tiffStart), exifEdits);
      if (done.length) {
        edited.push(...done);
        exifPiece = { seg: model.exifSeg, bytes: copy };
      }
    }
  } else if (opts.keepOrientation && needsOrientation(model.orientation)) {
    exifPiece = { bytes: minimalOrientationApp1(model.orientation) };
  }

  const header: Piece[] = [];
  const placed = new Set<number>();
  const take = (pred: (s: JpegSeg) => boolean, all = true) => {
    for (let i = 1; i < firstSos; i++) {
      if (placed.has(i) || isRemoved(i) || !pred(segs[i])) continue;
      header.push(seg(i));
      placed.add(i);
      if (!all) break;
    }
  };
  take((s) => s.cls === "jfif", false);
  if (exifPiece) {
    header.push(exifPiece);
    if (exifPiece.seg !== undefined) placed.add(exifPiece.seg);
  }
  if (replaceXmp && opts.xmp) header.push({ bytes: buildXmpApp1(opts.xmp) });
  take((s) => s.cls === "icc");
  take((s) => s.cls === "adobe");
  take(() => true);

  const pieces: Piece[] = [seg(0), ...header];
  for (let i = firstSos; i <= eoiIndex; i++) if (!isRemoved(i)) pieces.push(seg(i));

  // Keep the extra MPF images only if everything from the MPF segment to EOI is copied unchanged.
  if (mpf && !removedIds.has(mpf.id)) {
    const mpfSeg = model.segBlock.indexOf(mpf.id);
    const k = pieces.findIndex((x) => x.seg === mpfSeg);
    const unchanged = (pc: Piece, i: number) => pc.seg === i && pc.bytes.buffer === b.buffer && pc.bytes.byteOffset === b.byteOffset + segs[i].offset;
    let ok = k >= 0 && pieces.length - k === eoiIndex - mpfSeg + 1;
    for (let j = 0; ok && k + j < pieces.length; j++) {
      if (!unchanged(pieces[k + j], mpfSeg + j)) ok = false;
    }
    if (!ok) {
      removedIds.add(mpf.id);
      if (model.trailerBlockId) removedIds.add(model.trailerBlockId);
      if (k >= 0) pieces.splice(k, 1);
      warnings.push(
        "This file contains extra embedded images (HDR gain map or motion photo). They were removed because the index pointing to them could not be kept valid. The main image is unchanged.",
      );
    }
  }
  if (model.trailerBlockId && !removedIds.has(model.trailerBlockId)) {
    pieces.push({ bytes: b.subarray(model.parse.eoiEnd) });
  }

  const output = concat(pieces.map((x) => x.bytes));
  if (output.length > b.length + 70000) throw new ExifoError("unsafe", "Output grew unexpectedly.");
  return { output, removedIds: [...removedIds], warnings, edited };
}

/** Image-data byte ranges used for the identity hash: DQT, DHT, SOF, DRI, scans and EOI. */
export function jpegImageRanges(b: Uint8Array): ByteRange[] {
  const { segs } = parseJpeg(b);
  return segs
    .filter((s) => s.cls === "image" || s.cls === "sos" || s.cls === "eoi" || s.cls === "standalone")
    .map((s) => ({ offset: s.markerPos, size: s.end - s.markerPos }));
}

/** Reassemble the ICC profile from its APP2 parts (in sequence order). */
export function jpegIccProfile(b: Uint8Array, model: JpegModel): Uint8Array | null {
  const parts = model.parse.segs
    .filter((s) => s.cls === "icc")
    .map((s) => ({ seq: b[s.payloadStart + 12], data: b.subarray(s.payloadStart + 14, s.end) }))
    .sort((a, c) => a.seq - c.seq);
  return parts.length ? concat(parts.map((p) => p.data)) : null;
}

/** Payload helpers for the report. */
export function jpegPayloads(b: Uint8Array, model: JpegModel) {
  const { segs } = model.parse;
  const pick = (cls: JpegSegClass) => segs.filter((s) => s.cls === cls);
  const xmp = pick("xmp").map((s) => b.subarray(s.payloadStart + XMP_ID.length, s.end));
  const xmpExt = pick("xmpext");
  // Extended XMP: GUID(32) full length(4) offset(4) then data, possibly in several segments.
  let extended: Uint8Array | null = null;
  if (xmpExt.length) {
    const first = xmpExt[0];
    const total = u32be(b, first.payloadStart + XMP_EXT_ID.length + 32);
    if (total > 0 && total < 50 * 1024 * 1024) {
      extended = new Uint8Array(total);
      for (const s of xmpExt) {
        const base = s.payloadStart + XMP_EXT_ID.length;
        const off = u32be(b, base + 36);
        const data = b.subarray(base + 40, s.end);
        if (off + data.length <= total) extended.set(data, off);
      }
    }
  }
  // C2PA: concatenate JUMBF packets per box instance, ordered by sequence number.
  const c2paSegs = pick("c2pa").map((s) => ({
    en: u16be(b, s.payloadStart + 2),
    z: u32be(b, s.payloadStart + 4),
    s,
  }));
  c2paSegs.sort((a, c) => a.en - c.en || a.z - c.z);
  const jumbfParts: Uint8Array[] = [];
  let lastEn = -1;
  for (const { en, s } of c2paSegs) {
    const boxStart = s.payloadStart + 8;
    if (en !== lastEn) {
      jumbfParts.push(b.subarray(boxStart, s.end));
      lastEn = en;
    } else {
      const skip = u32be(b, boxStart) === 1 ? 16 : 8; // repeated LBox/TBox (and XLBox)
      jumbfParts.push(b.subarray(boxStart + skip, s.end));
    }
  }
  const iptc = pick("iptc").map((s) => b.subarray(s.payloadStart + PS_ID.length, s.end));
  const comments = pick("com").map((s) => b.subarray(s.payloadStart, s.end));
  const jfif = pick("jfif")[0];
  return {
    exif: model.exifTiff,
    xmp: xmp[0] ?? null,
    xmpExtended: extended,
    c2pa: jumbfParts.length ? concat(jumbfParts) : null,
    iptc: iptc.length ? concat(iptc) : null,
    comments,
    jfif: jfif ? b.subarray(jfif.payloadStart, jfif.end) : null,
    icc: jpegIccProfile(b, model),
  };
}
