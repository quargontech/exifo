/**
 * Human-readable report for a scanned file: grouped fields, location,
 * AI and provenance signals, and descriptive fields for the editor.
 */

import { parse as exifrParse } from "exifr";
import { AI_PNG_KEYWORDS, MAYBE_AI_PNG_KEYWORDS, looksLikeAiTool, looksLikeGenerationParams } from "./ai-signals";
import { ascii, bytesEqual, latin1, utf8 } from "./bytes";
import { isAiEditedType, isAiGeneratedType, shortSourceType, summarizeC2pa, type C2paSummary } from "./c2pa-lite";
import { scan } from "./container";
import { formatBytes, formatCoordinate, formatDateTime, ORIENTATION_TEXT, truncate } from "./format";
import { parseIcc, type IccSummary } from "./icc";
import { parseIrb } from "./iptc";
import { buildJpegModel, jpegPayloads } from "./jpeg";
import { decodePngText, type PngText } from "./png-text";
import { buildPngModel, pngPayloads } from "./png";
import { unzlibSync } from "fflate";
import { buildWebpModel, webpPayloads } from "./webp";
import { parseXmp, xmpCoordinate, xmpGet, type XmpProp } from "./xmp";
import type { BlockKind, MetaBlock, ScanResult } from "./types";

export interface ReportField {
  key: string;
  value: string;
  /** Points at generative AI or provenance. */
  ai?: boolean;
}

export interface FieldGroup {
  id: string;
  title: string;
  /** e.g. "APP1 · 21.4 KB", "inside EXIF", "APP2 · 548 B · always kept". */
  source: string;
  /** Short container name for tables, e.g. "APP1", "iTXt", "caBX". */
  container: string;
  removable: boolean;
  blockId?: string;
  kind: BlockKind | "icc" | "gps";
  fields: ReportField[];
}

export interface GpsInfo {
  lat: number;
  lon: number;
  alt?: number;
  source: "EXIF" | "XMP";
}

export interface Descriptive {
  title?: string;
  description?: string;
  creator?: string[];
  copyright?: string;
  credit?: string;
  keywords?: string[];
  dateCreated?: string;
}

export interface Report {
  groups: FieldGroup[];
  gps?: GpsInfo;
  aiSignals: string[];
  /** "ai" when the file marks itself as AI-made; "credentials" when it only has Content Credentials. */
  aiFlag: "ai" | "credentials" | null;
  /** IPTC digital source type from XMP (full URI). */
  digitalSourceType?: string;
  prompts: { source: string; text: string }[];
  c2pa?: C2paSummary;
  /** Generating or editing tool named in the file. */
  tool?: string;
  descriptive: Descriptive;
  /** Raw XMP packet (main), for editing and location removal. */
  xmp?: string;
  icc?: IccSummary;
  fieldCount: number;
}

export interface Analysis {
  scan: ScanResult;
  report: Report;
}

/* ------------------------------------------------------------------ EXIF */

type ExifBlocks = Partial<Record<"ifd0" | "exif" | "gps" | "interop" | "ifd1", Record<string, unknown>>>;

async function readExif(tiff: Uint8Array): Promise<ExifBlocks> {
  try {
    const out = await exifrParse(tiff.slice(), {
      tiff: true,
      ifd0: true,
      ifd1: true,
      exif: true,
      gps: true,
      interop: true,
      makerNote: false,
      userComment: true,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
      translateKeys: true,
      translateValues: true,
      reviveValues: false,
      sanitize: true,
      mergeOutput: false,
      silentErrors: true,
    } as never);
    return (out ?? {}) as ExifBlocks;
  } catch {
    return {};
  }
}

const HIDDEN_EXIF = new Set([
  "MakerNote",
  "ThumbnailOffset",
  "ThumbnailLength",
  "JPEGInterchangeFormat",
  "JPEGInterchangeFormatLength",
  "StripOffsets",
  "StripByteCounts",
  "ExifIFDPointer",
  "GPSInfoIFDPointer",
  "InteropIFDPointer",
  "PrintIM",
  "ApplicationNotes",
  "errors",
]);

function decodeUserComment(v: Uint8Array): string {
  const head = ascii(v, 0, 8);
  const body = v.subarray(8);
  if (head.startsWith("ASCII")) return latin1(body).replace(/\0+$/, "");
  if (head.startsWith("UNICODE")) {
    const be = new TextDecoder("utf-16be").decode(body).replace(/\0+$/, "");
    const le = new TextDecoder("utf-16le").decode(body).replace(/\0+$/, "");
    const score = (s: string) => (s.match(/[\x20-\x7e]/g) ?? []).length;
    return score(be) >= score(le) ? be : le;
  }
  return utf8(v).replace(/\0+$/, "");
}

function isPrintable(b: Uint8Array) {
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (c === 0 && i === b.length - 1) continue;
    if (c < 0x20 && c !== 0x0a && c !== 0x0d && c !== 0x09) return false;
    if (c > 0x7e) return false;
  }
  return true;
}

function fmtNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(6)));
}

function fmtExif(key: string, v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (key === "ExposureTime" && typeof v === "number") return v < 1 && v > 0 ? `1/${Math.round(1 / v)} s` : `${fmtNumber(v)} s`;
  if (key === "FNumber" && typeof v === "number") return `f/${fmtNumber(v)}`;
  if ((key === "FocalLength" || key === "FocalLengthIn35mmFormat") && typeof v === "number") return `${fmtNumber(v)} mm`;
  if (key === "UserComment" && v instanceof Uint8Array) return decodeUserComment(v) || null;
  if (key.startsWith("XP") && v instanceof Uint8Array) return new TextDecoder("utf-16le").decode(v).replace(/\0+$/, "");
  if (v instanceof Uint8Array) {
    if (v.length && v.length <= 256 && isPrintable(v)) return latin1(v).replace(/\0+$/, "");
    return `${formatBytes(v.length)} of binary data`;
  }
  if (typeof v === "string") return v.replace(/\0+$/, "").trim() || null;
  if (typeof v === "number") return fmtNumber(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.map((x) => (typeof x === "number" ? fmtNumber(x) : String(x))).join(", ");
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object") {
    // Typed arrays (Int16Array…) and array-like objects ({"0":1,"1":120}) → a plain comma list.
    const arr = ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : asArrayLike(v as object);
    if (arr) return arr.map((x) => (typeof x === "number" ? fmtNumber(x) : String(x))).join(", ") || null;
  }
  try {
    return truncate(JSON.stringify(v), 400);
  } catch {
    return String(v);
  }
}

/** Values of an object whose keys are exactly 0..n-1, else null. */
function asArrayLike(o: object): unknown[] | null {
  const keys = Object.keys(o);
  if (!keys.length) return null;
  for (let i = 0; i < keys.length; i++) if (keys[i] !== String(i)) return null;
  return keys.map((k) => (o as Record<string, unknown>)[k]);
}

function dms(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (Array.isArray(v) && v.length >= 1 && v.every((x) => typeof x === "number")) {
    const [d, m = 0, s = 0] = v as number[];
    return d + m / 60 + s / 3600;
  }
  return undefined;
}

/* ------------------------------------------------------------------ helpers */

const AI_SIGNAL_TOOL_KEYS = new Set(["Software", "Make", "ImageDescription", "UserComment", "Artist", "HostComputer", "XPComment"]);

function firstLine(s: string) {
  return truncate(s.replace(/\s+/g, " ").trim(), 160);
}

function detectTrailer(b: Uint8Array): string {
  if (b[0] === 0xff && b[1] === 0xd8) return "Embedded JPEG image";
  if (bytesEqual(b, 4, "ftyp")) return "Embedded video (MP4 / MOV)";
  if (bytesEqual(b, 0, [0x89, 0x50, 0x4e, 0x47])) return "Embedded PNG image";
  const head = latin1(b.subarray(0, Math.min(b.length, 64)));
  if (/MotionPhoto|mpvd/i.test(head)) return "Motion photo video";
  if (b.every((x) => x === 0)) return "Zero padding";
  return "Unknown data";
}

function timeChunk(b: Uint8Array): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${(b[0] << 8) | b[1]}-${pad(b[2])}-${pad(b[3])} ${pad(b[4])}:${pad(b[5])}:${pad(b[6])}`;
}

/* ------------------------------------------------------------------ analyze */

interface Payloads {
  exif: Uint8Array | null;
  xmp: string | null;
  xmpExtended: string | null;
  c2pa: Uint8Array | null;
  iptc: Uint8Array | null;
  comments: string[];
  texts: PngText[];
  icc: Uint8Array | null;
  time: Uint8Array | null;
  trailer: Uint8Array | null;
}

function payloadsFor(b: Uint8Array, s: ScanResult): Payloads {
  const trailerBlock = s.blocks.find((x) => x.kind === "trailer");
  const trailer = trailerBlock ? b.subarray(trailerBlock.offset, trailerBlock.offset + Math.min(trailerBlock.size, 4096)) : null;
  if (s.format === "jpeg") {
    const p = jpegPayloads(b, buildJpegModel(b));
    return {
      exif: p.exif,
      xmp: p.xmp ? utf8(p.xmp) : null,
      xmpExtended: p.xmpExtended ? utf8(p.xmpExtended) : null,
      c2pa: p.c2pa,
      iptc: p.iptc,
      comments: p.comments.map((c) => utf8(c)),
      texts: [],
      icc: p.icc,
      time: null,
      trailer,
    };
  }
  if (s.format === "png") {
    const p = pngPayloads(b, buildPngModel(b));
    const texts = p.texts.map((t) => decodePngText(t.type, t.data)).filter((t): t is PngText => !!t);
    const xmpText = texts.find((t) => t.keyword === "XML:com.adobe.xmp");
    let icc: Uint8Array | null = null;
    if (p.iccp) {
      const z = p.iccp.indexOf(0);
      try {
        icc = z > 0 ? unzlibSync(p.iccp.subarray(z + 2)) : null;
      } catch {
        icc = null;
      }
    }
    return {
      exif: p.exif,
      xmp: xmpText?.text ?? null,
      xmpExtended: null,
      c2pa: p.c2pa,
      iptc: null,
      comments: [],
      texts: texts.filter((t) => t !== xmpText),
      icc,
      time: p.time,
      trailer,
    };
  }
  const p = webpPayloads(b, buildWebpModel(b));
  return {
    exif: p.exif,
    xmp: p.xmp ? utf8(p.xmp) : null,
    xmpExtended: null,
    c2pa: p.c2pa,
    iptc: null,
    comments: [],
    texts: [],
    icc: p.icc,
    time: null,
    trailer,
  };
}

export async function analyze(b: Uint8Array): Promise<Analysis> {
  const s = scan(b);
  const report = await buildReport(b, s);
  return { scan: s, report };
}

export async function buildReport(b: Uint8Array, s: ScanResult): Promise<Report> {
  const p = payloadsFor(b, s);
  const groups: FieldGroup[] = [];
  const aiSignals: string[] = [];
  let strongAi = false;
  const prompts: Report["prompts"] = [];
  const descriptive: Descriptive = {};
  const block = (kind: BlockKind) => s.blocks.find((x) => x.kind === kind);
  const signal = (blk: MetaBlock | undefined, text: string, strong = true) => {
    if (!aiSignals.includes(text)) aiSignals.push(text);
    if (blk && !blk.aiSignals.includes(text)) blk.aiSignals.push(text);
    if (strong) strongAi = true;
  };
  const src = (blk: MetaBlock | undefined, extra?: string) =>
    blk ? `${blk.container} · ${formatBytes(blk.size)}${extra ? ` · ${extra}` : ""}` : (extra ?? "");
  let tool: string | undefined;

  /* EXIF + GPS */
  let gps: GpsInfo | undefined;
  const exifBlock = block("exif");
  if (p.exif) {
    const ex = await readExif(p.exif);
    const fields: ReportField[] = [];
    const push = (key: string, v: unknown, prefix = "") => {
      if (HIDDEN_EXIF.has(key)) return;
      let value = key === "Orientation" ? `${s.orientation} (${ORIENTATION_TEXT[s.orientation]})` : fmtExif(key, v);
      if (!value) return;
      value = truncate(value, 2000);
      let ai = false;
      if (AI_SIGNAL_TOOL_KEYS.has(key)) {
        if (looksLikeAiTool(value)) {
          ai = true;
          signal(exifBlock, `EXIF ${key}: ${firstLine(value)}`);
        }
        if (looksLikeGenerationParams(value)) {
          ai = true;
          signal(exifBlock, `EXIF ${key} holds generation settings`);
          prompts.push({ source: `EXIF ${key}`, text: value });
        }
      }
      fields.push({ key: prefix + key, value, ai });
    };
    for (const part of ["ifd0", "exif", "interop"] as const) for (const [k, v] of Object.entries(ex[part] ?? {})) push(k, v);
    for (const [k, v] of Object.entries(ex.ifd1 ?? {})) push(k, v, "Thumbnail ");
    if (s.hasExifThumbnail) fields.push({ key: "Embedded thumbnail", value: "Yes, a small preview that can differ from the main image" });
    const ifd0 = ex.ifd0 ?? {};
    const exifIfd = ex.exif ?? {};
    tool ??= typeof ifd0.Software === "string" ? ifd0.Software.trim() : undefined;
    if (typeof ifd0.Artist === "string" && ifd0.Artist.trim()) descriptive.creator ??= [ifd0.Artist.trim()];
    if (typeof ifd0.Copyright === "string" && ifd0.Copyright.trim()) descriptive.copyright ??= ifd0.Copyright.trim();
    if (typeof ifd0.ImageDescription === "string" && ifd0.ImageDescription.trim()) descriptive.description ??= ifd0.ImageDescription.trim();
    const dto = exifIfd.DateTimeOriginal ?? exifIfd.CreateDate ?? ifd0.ModifyDate;
    if (typeof dto === "string") {
      const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(dto);
      if (m) descriptive.dateCreated ??= `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    }
    groups.push({
      id: "exif",
      title: "EXIF",
      source: src(exifBlock),
      container: exifBlock?.container ?? "EXIF",
      removable: true,
      blockId: exifBlock?.id,
      kind: "exif",
      fields,
    });

    const g = ex.gps ?? {};
    if (Object.keys(g).length) {
      const gfields: ReportField[] = [];
      let lat = dms(g.GPSLatitude);
      let lon = dms(g.GPSLongitude);
      if (lat !== undefined && /S/i.test(String(g.GPSLatitudeRef ?? ""))) lat = -lat;
      if (lon !== undefined && /W/i.test(String(g.GPSLongitudeRef ?? ""))) lon = -lon;
      let alt = typeof g.GPSAltitude === "number" ? g.GPSAltitude : undefined;
      if (alt !== undefined && (g.GPSAltitudeRef === 1 || /below/i.test(String(g.GPSAltitudeRef ?? "")))) alt = -alt;
      if (lat !== undefined) gfields.push({ key: "GPSLatitude", value: formatCoordinate(lat, true) });
      if (lon !== undefined) gfields.push({ key: "GPSLongitude", value: formatCoordinate(lon, false) });
      if (alt !== undefined) gfields.push({ key: "GPSAltitude", value: `${fmtNumber(Math.round(alt * 10) / 10)} m` });
      for (const [k, v] of Object.entries(g)) {
        if (["GPSLatitude", "GPSLongitude", "GPSAltitude", "GPSLatitudeRef", "GPSLongitudeRef", "GPSAltitudeRef", "latitude", "longitude"].includes(k))
          continue;
        let value = fmtExif(k, v);
        if (k === "GPSTimeStamp" && Array.isArray(v)) value = (v as number[]).map((x) => String(Math.floor(x)).padStart(2, "0")).join(":");
        if (value) gfields.push({ key: k, value });
      }
      if (lat !== undefined && lon !== undefined && (lat !== 0 || lon !== 0)) gps = { lat, lon, alt, source: "EXIF" };
      if (gfields.length) {
        groups.push({
          id: "gps",
          title: "GPS",
          source: "inside EXIF",
          container: exifBlock?.container ?? "EXIF",
          removable: true,
          blockId: exifBlock?.id,
          kind: "gps",
          fields: gfields,
        });
      }
    }
  }

  /* XMP */
  const xmpBlock = block("xmp");
  let xmpProps: XmpProp[] = [];
  let digitalSourceType: string | undefined;
  if (p.xmp || p.xmpExtended) {
    xmpProps = [...(p.xmp ? parseXmp(p.xmp) : []), ...(p.xmpExtended ? parseXmp(p.xmpExtended) : [])];
    const fields: ReportField[] = [];
    for (const prop of xmpProps) {
      let value = prop.value;
      let ai = false;
      if (prop.name === "DigitalSourceType") {
        digitalSourceType = value;
        value = shortSourceType(value);
        if (isAiGeneratedType(prop.value) || isAiEditedType(prop.value)) {
          ai = true;
          signal(xmpBlock, `DigitalSourceType: ${value}`);
        }
      } else if (["CreatorTool", "History", "Credit", "Source", "softwareAgent", "Description"].includes(prop.name) && looksLikeAiTool(value)) {
        ai = true;
        signal(xmpBlock, `XMP ${prop.name}: ${firstLine(value)}`);
      }
      if (/^GPS(Latitude|Longitude)$/.test(prop.name)) {
        const deg = xmpCoordinate(value);
        if (deg !== undefined) value = formatCoordinate(deg, prop.name.endsWith("Latitude"));
      }
      if (!value) continue;
      const key = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      fields.push({ key, value: truncate(value, 2000), ai });
    }
    tool ??= xmpGet(xmpProps, "xmp:CreatorTool");
    const xc = xmpGet(xmpProps, "dc:creator");
    if (xc) descriptive.creator = xc.split("; ").filter(Boolean);
    descriptive.title = xmpGet(xmpProps, "dc:title") ?? descriptive.title;
    descriptive.description = xmpGet(xmpProps, "dc:description") ?? descriptive.description;
    descriptive.copyright = xmpGet(xmpProps, "dc:rights") ?? descriptive.copyright;
    descriptive.credit = xmpGet(xmpProps, "photoshop:Credit") ?? descriptive.credit;
    const kw = xmpGet(xmpProps, "dc:subject");
    if (kw) descriptive.keywords = kw.split("; ").filter(Boolean);
    descriptive.dateCreated = xmpGet(xmpProps, "photoshop:DateCreated") ?? descriptive.dateCreated;
    if (!gps) {
      const lat = xmpCoordinate(xmpGet(xmpProps, "exif:GPSLatitude"));
      const lon = xmpCoordinate(xmpGet(xmpProps, "exif:GPSLongitude"));
      if (lat !== undefined && lon !== undefined) gps = { lat, lon, source: "XMP" };
    }
    groups.push({
      id: "xmp",
      title: "XMP",
      source: src(xmpBlock, xmpBlock?.label.includes("extended") ? "with extended XMP" : undefined),
      container: xmpBlock?.container ?? "XMP",
      removable: true,
      blockId: xmpBlock?.id,
      kind: "xmp",
      fields,
    });
  }

  /* IPTC */
  const iptcBlock = block("iptc");
  if (p.iptc) {
    const r = parseIrb(p.iptc);
    const fields: ReportField[] = r.fields.map(([key, value]) => {
      const ai = ["Credit", "Source", "OriginatingProgram", "SpecialInstructions"].includes(key) && looksLikeAiTool(value);
      if (ai) signal(iptcBlock, `IPTC ${key}: ${firstLine(value)}`);
      return { key, value: truncate(value, 2000), ai };
    });
    const others = r.resources.filter((x) => x !== "IPTC-NAA record");
    if (others.length) fields.push({ key: "Photoshop resources", value: others.join(", ") });
    const get = (k: string) => r.fields.find(([x]) => x === k)?.[1];
    descriptive.title ??= get("ObjectName") ?? get("Headline");
    descriptive.description ??= get("Caption-Abstract");
    if (!descriptive.creator && get("By-line")) descriptive.creator = [get("By-line")!];
    descriptive.copyright ??= get("CopyrightNotice");
    descriptive.credit ??= get("Credit");
    if (!descriptive.keywords && get("Keywords")) descriptive.keywords = get("Keywords")!.split(", ");
    groups.push({
      id: "iptc",
      title: "IPTC",
      source: src(iptcBlock),
      container: iptcBlock?.container ?? "APP13",
      removable: true,
      blockId: iptcBlock?.id,
      kind: "iptc",
      fields,
    });
  }

  /* PNG text */
  const textBlock = block("text");
  if (p.texts.length) {
    const fields: ReportField[] = [];
    for (const t of p.texts) {
      let ai = false;
      if (AI_PNG_KEYWORDS.has(t.keyword) || AI_PNG_KEYWORDS.has(t.keyword.toLowerCase())) {
        ai = true;
        signal(textBlock, `PNG text: ${t.keyword}`);
        prompts.push({ source: `PNG text “${t.keyword}”`, text: t.text });
      } else if (MAYBE_AI_PNG_KEYWORDS.has(t.keyword) && (looksLikeAiTool(t.text) || looksLikeGenerationParams(t.text))) {
        ai = true;
        signal(textBlock, `PNG text ${t.keyword}: ${firstLine(t.text)}`);
        if (looksLikeGenerationParams(t.text) || t.keyword === "Description") prompts.push({ source: `PNG text “${t.keyword}”`, text: t.text });
      }
      if (t.keyword === "Software") tool ??= t.text.trim();
      if (t.keyword === "Title") descriptive.title ??= t.text.trim();
      if (t.keyword === "Author") descriptive.creator ??= [t.text.trim()];
      if (t.keyword === "Copyright") descriptive.copyright ??= t.text.trim();
      if (t.keyword === "Description" && !ai) descriptive.description ??= t.text.trim();
      fields.push({ key: t.keyword, value: truncate(t.text, 4000), ai });
    }
    groups.push({
      id: "text",
      title: "PNG text",
      source: src(textBlock),
      container: textBlock?.container ?? "tEXt",
      removable: true,
      blockId: textBlock?.id,
      kind: "text",
      fields,
    });
  }

  /* C2PA */
  const c2paBlock = block("c2pa");
  let c2pa: C2paSummary | undefined;
  if (p.c2pa && c2paBlock) {
    c2pa = summarizeC2pa(p.c2pa);
    signal(c2paBlock, "Content Credentials (C2PA) manifest", false);
    const fields: ReportField[] = [];
    if (c2pa.claimGenerator) fields.push({ key: "Claim generator", value: c2pa.claimGenerator, ai: c2pa.aiGenerated || c2pa.aiEdited });
    if (c2pa.title) fields.push({ key: "Title", value: c2pa.title });
    fields.push({ key: "Signature", value: c2pa.signer ? `Present, signed by ${c2pa.signer}` : "Present" });
    if (c2pa.signedAt) fields.push({ key: "Signed on", value: formatDateTime(c2pa.signedAt) });
    if (c2pa.actions.length) fields.push({ key: "Actions", value: [...new Set(c2pa.actions.map((a) => a.label))].join(", ") });
    for (const t of c2pa.digitalSourceTypes) {
      const ai = isAiGeneratedType(t) || isAiEditedType(t);
      fields.push({ key: "Source type", value: shortSourceType(t), ai });
    }
    if (c2pa.ingredients) fields.push({ key: "Ingredients", value: String(c2pa.ingredients) });
    if (c2pa.manifests > 1) fields.push({ key: "Manifests", value: String(c2pa.manifests) });
    if (c2pa.error) fields.push({ key: "Note", value: c2pa.error });
    if (c2pa.aiGenerated) signal(c2paBlock, "Content Credentials: created by a generative model");
    else if (c2pa.aiEdited) signal(c2paBlock, "Content Credentials: edited with a generative model");
    tool = c2pa.claimGenerator ?? tool;
    groups.push({
      id: "c2pa",
      title: "Content Credentials",
      source: src(c2paBlock),
      container: c2paBlock.container,
      removable: true,
      blockId: c2paBlock.id,
      kind: "c2pa",
      fields,
    });
  }

  /* Comments */
  const commentBlock = block("comment");
  if (p.comments.length && commentBlock) {
    const fields = p.comments.map((c) => {
      const ai = looksLikeAiTool(c) || looksLikeGenerationParams(c);
      if (ai) signal(commentBlock, `Comment: ${firstLine(c)}`);
      return { key: "Comment", value: truncate(c, 2000), ai };
    });
    groups.push({
      id: "comment",
      title: "Comment",
      source: src(commentBlock),
      container: "COM",
      removable: true,
      blockId: commentBlock.id,
      kind: "comment",
      fields,
    });
  }

  /* Thumbnail, MPF, unknown, trailer */
  for (const blk of s.blocks) {
    if (blk.kind === "thumbnail") {
      groups.push({
        id: blk.id,
        title: "Thumbnail",
        source: src(blk),
        container: blk.container,
        removable: true,
        blockId: blk.id,
        kind: "thumbnail",
        fields: [{ key: "Embedded preview", value: `${formatBytes(blk.size)}, can differ from the main image` }],
      });
    } else if (blk.kind === "mpf") {
      groups.push({
        id: blk.id,
        title: "Multi-picture index",
        source: src(blk),
        container: blk.container,
        removable: true,
        blockId: blk.id,
        kind: "mpf",
        fields: [{ key: "Describes", value: "Extra images stored after the main image (HDR gain map, depth map or motion photo)" }],
      });
    } else if (blk.kind === "unknown") {
      const fields: ReportField[] = [{ key: "Size", value: formatBytes(blk.size) }];
      if (blk.id === "unknown-time" && p.time) fields.unshift({ key: "Last modified", value: timeChunk(p.time) });
      groups.push({ id: blk.id, title: blk.label, source: src(blk), container: blk.container, removable: true, blockId: blk.id, kind: "unknown", fields });
    } else if (blk.kind === "trailer" && p.trailer) {
      groups.push({
        id: blk.id,
        title: "Trailing data",
        source: src(blk),
        container: blk.container,
        removable: true,
        blockId: blk.id,
        kind: "trailer",
        fields: [
          { key: "Size", value: formatBytes(blk.size) },
          { key: "Looks like", value: detectTrailer(p.trailer) },
        ],
      });
    }
  }

  /* ICC (kept) */
  let icc: IccSummary | undefined;
  if (p.icc) {
    const parsed = parseIcc(p.icc);
    if (parsed) {
      icc = parsed;
      const fields: ReportField[] = [];
      if (parsed.description) fields.push({ key: "Description", value: parsed.description });
      fields.push({ key: "Colour space", value: parsed.colorSpace });
      fields.push({ key: "Device class", value: parsed.deviceClass });
      fields.push({ key: "Version", value: parsed.version });
      if (parsed.copyright) fields.push({ key: "Copyright", value: truncate(parsed.copyright, 200) });
      const container = s.format === "jpeg" ? "APP2" : s.format === "png" ? "iCCP" : "ICCP chunk";
      groups.push({
        id: "icc",
        title: "Colour profile",
        source: `${container} · ${formatBytes(parsed.size)} · always kept`,
        container,
        removable: false,
        kind: "icc",
        fields,
      });
    }
  }

  const c2paPresent = !!c2paBlock;
  const aiFlag: Report["aiFlag"] = strongAi ? "ai" : c2paPresent ? "credentials" : null;
  return {
    groups,
    gps,
    aiSignals,
    aiFlag,
    digitalSourceType,
    prompts,
    c2pa,
    tool,
    descriptive,
    xmp: p.xmp ?? undefined,
    icc,
    fieldCount: groups.reduce((n, g) => n + g.fields.length, 0),
  };
}
