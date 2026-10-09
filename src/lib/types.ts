export type Format = "jpeg" | "png" | "webp";

export type BlockKind = "c2pa" | "xmp" | "exif" | "iptc" | "text" | "comment" | "thumbnail" | "mpf" | "trailer" | "unknown";

export const ALL_BLOCK_KINDS: BlockKind[] = ["c2pa", "xmp", "exif", "iptc", "text", "comment", "thumbnail", "mpf", "trailer", "unknown"];

export interface ByteRange {
  offset: number;
  size: number;
}

export interface MetaBlock {
  /** Unique per file, stable between scan() and strip() of the same bytes. */
  id: string;
  kind: BlockKind;
  /** Long label, e.g. "Content Credentials (C2PA)". */
  label: string;
  /** Short chip label, e.g. "C2PA". */
  short: string;
  /** Where it lives in the container, e.g. "APP11", "caBX", "iTXt". */
  container: string;
  /** Byte offset of the first part in the original file. */
  offset: number;
  /** Total bytes across all parts. */
  size: number;
  /** Every byte range that belongs to this block (multi-segment blocks have several). */
  ranges: ByteRange[];
  /** e.g. ["DigitalSourceType: trainedAlgorithmicMedia"]. Filled by the report. */
  aiSignals: string[];
  /** Parsed values for display. Filled by the report. */
  fields?: Record<string, string>;
}

/** Role of a structural segment: removable metadata, image data, or kept because it affects rendering. */
export type SegmentRole = "meta" | "image" | "render";

export interface Segment {
  name: string;
  offset: number;
  size: number;
  role: SegmentRole;
  blockId?: string;
}

export interface ScanResult {
  format: Format;
  width: number;
  height: number;
  /** 1–8, 1 = normal. */
  orientation: number;
  hasIcc: boolean;
  isAnimated: boolean;
  blocks: MetaBlock[];
  /** Every segment or chunk in file order. */
  segments: Segment[];
  warnings: string[];
  fileSize: number;
  hasGps: boolean;
  hasExifThumbnail: boolean;
}

export interface ExifEdits {
  /** Remove the GPS IFD. */
  gps?: boolean;
  /** Remove make, model, serial numbers and maker notes. */
  device?: boolean;
  /** Remove date and time tags. */
  dates?: boolean;
  /** Remove IFD1 and its embedded thumbnail. */
  thumbnail?: boolean;
}

export interface StripOptions {
  /** Block kinds to remove completely. Default: all kinds. */
  remove: BlockKind[];
  /** Default: true. */
  keepOrientation: boolean;
  /** Field-level edits applied in place when the EXIF block is kept. */
  exifEdits?: ExifEdits;
  /**
   * When set, every existing XMP block is replaced by this packet
   * (used by Edit, "Keep copyright only" and location removal).
   */
  xmp?: string;
}

export interface StripResult {
  output: ArrayBuffer;
  removed: MetaBlock[];
  bytesBefore: number;
  bytesAfter: number;
  /** SHA-256 of the image data matches. */
  imageDataIdentical: boolean;
  warnings: string[];
  /** Human-readable list of in-place changes, e.g. "GPS location". */
  edited: string[];
}

export class ExifoError extends Error {
  constructor(
    public code: "damaged" | "unsupported" | "variant" | "unsafe" | "too-large",
    message: string,
  ) {
    super(message);
    this.name = "ExifoError";
  }
}

export const damaged = (detail?: string) => new ExifoError("damaged", detail ? `File is damaged or incomplete (${detail}).` : "File is damaged or incomplete.");
