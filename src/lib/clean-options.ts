/** Map the Clean screen's options to StripOptions for one file. */

import { isLocationProp, removeXmpProps } from "./xmp";
import { buildXmpPacket, hasAnyField, MAX_JPEG_XMP } from "./xmp-write";
import type { Analysis } from "./report";
import { ALL_BLOCK_KINDS, type BlockKind, type MetaBlock, type StripOptions } from "./types";

export interface CustomSelection {
  exif: boolean;
  xmp: boolean;
  iptc: boolean;
  text: boolean;
  thumbnails: boolean;
  c2pa: boolean;
  other: boolean;
  /** Field-level, used when EXIF is kept. */
  gps: boolean;
  device: boolean;
  dates: boolean;
  /** Write back creator and copyright after removing everything. */
  keepCopyright: boolean;
}

export interface CleanOptions {
  preset: "all" | "custom";
  keepOrientation: boolean;
  custom: CustomSelection;
}

export const DEFAULT_CUSTOM: CustomSelection = {
  exif: true,
  xmp: true,
  iptc: true,
  text: true,
  thumbnails: true,
  c2pa: true,
  other: true,
  gps: true,
  device: false,
  dates: false,
  keepCopyright: false,
};

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = { preset: "all", keepOrientation: true, custom: DEFAULT_CUSTOM };

export type PresetId = "location" | "device" | "dates" | "thumbnail" | "copyright";

export const SELECTIVE_PRESETS: { id: PresetId; label: string }[] = [
  { id: "location", label: "Location only" },
  { id: "device", label: "Device details" },
  { id: "dates", label: "Dates" },
  { id: "thumbnail", label: "Thumbnail" },
  { id: "copyright", label: "Keep copyright only" },
];

const NONE: CustomSelection = {
  exif: false,
  xmp: false,
  iptc: false,
  text: false,
  thumbnails: false,
  c2pa: false,
  other: false,
  gps: false,
  device: false,
  dates: false,
  keepCopyright: false,
};

export function applyPreset(id: PresetId): CustomSelection {
  switch (id) {
    case "location":
      return { ...NONE, gps: true };
    case "device":
      return { ...NONE, device: true };
    case "dates":
      return { ...NONE, dates: true };
    case "thumbnail":
      return { ...NONE, thumbnails: true };
    case "copyright":
      return { ...DEFAULT_CUSTOM, keepCopyright: true };
  }
}

export function removedKinds(o: CleanOptions): BlockKind[] {
  if (o.preset === "all") return [...ALL_BLOCK_KINDS];
  const c = o.custom;
  if (c.keepCopyright) return [...ALL_BLOCK_KINDS];
  const kinds: BlockKind[] = [];
  if (c.exif) kinds.push("exif");
  if (c.xmp) kinds.push("xmp");
  if (c.iptc) kinds.push("iptc");
  if (c.text) kinds.push("text", "comment");
  if (c.thumbnails) kinds.push("thumbnail");
  if (c.c2pa) kinds.push("c2pa");
  if (c.other) kinds.push("unknown", "mpf", "trailer");
  return kinds;
}

export interface PlannedStrip {
  options: StripOptions;
  notes: string[];
}

export function toStripOptions(o: CleanOptions, analysis?: Analysis): PlannedStrip {
  const remove = removedKinds(o);
  const opts: StripOptions = { remove, keepOrientation: o.keepOrientation };
  const notes: string[] = [];
  if (o.preset === "custom") {
    const c = o.custom;
    if (!c.exif && !c.keepCopyright) opts.exifEdits = { gps: c.gps, device: c.device, dates: c.dates, thumbnail: c.thumbnails };
    // Location inside a kept XMP block is removed too.
    const xmpText = analysis?.report.xmp;
    if (c.gps && !c.xmp && !c.keepCopyright && xmpText) {
      const { xml, removed } = removeXmpProps(xmpText, isLocationProp);
      if (removed) {
        if (analysis.scan.format === "jpeg" && new TextEncoder().encode(xml).length > MAX_JPEG_XMP) {
          opts.remove = [...opts.remove, "xmp"];
          notes.push("The XMP block also held a location and was too large to rewrite, so it was removed.");
        } else opts.xmp = xml;
      }
    }
    if (c.keepCopyright && analysis) {
      const d = analysis.report.descriptive;
      const fields = { creator: d.creator, copyright: d.copyright };
      if (hasAnyField(fields)) opts.xmp = buildXmpPacket(fields);
    }
  }
  return { options: opts, notes };
}

/** Whether a block will be removed with these options (MPF safety rules aside). */
export function willRemove(blk: MetaBlock, opts: StripOptions): boolean {
  return opts.remove.includes(blk.kind) || (opts.xmp !== undefined && blk.kind === "xmp");
}

/** Human summary of what stays, for the helper text under the options. */
export function keptSummary(o: CleanOptions): string {
  const base = "Colour profile, transparency and animation are always kept, because they change how the image looks.";
  if (o.preset === "all") return `Every metadata block is removed. ${base}`;
  const c = o.custom;
  if (c.keepCopyright) return `Everything is removed, then the creator and copyright are written back as a fresh XMP block. ${base}`;
  const kept: string[] = [];
  if (!c.exif) kept.push("EXIF");
  if (!c.xmp) kept.push("XMP");
  if (!c.iptc) kept.push("IPTC");
  if (!c.text) kept.push("Text and comments");
  if (!c.c2pa) kept.push("Content Credentials");
  if (!c.thumbnails) kept.push("Thumbnails");
  if (!c.other) kept.push("Other blocks");
  const fieldEdits: string[] = [];
  if (!c.exif) {
    if (c.gps) fieldEdits.push("location");
    if (c.device) fieldEdits.push("device details");
    if (c.dates) fieldEdits.push("dates");
  }
  let s = "";
  if (!kept.length) s = "Every metadata block is removed. ";
  else if (kept.length === 1) s = `${kept[0]} ${/Credentials|comments|blocks|Thumbnails/.test(kept[0]) ? "stay" : "stays"} in the file. `;
  else s = `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]} stay in the file. `;
  if (fieldEdits.length) s += `Inside EXIF, ${fieldEdits.join(", ")} ${fieldEdits.length > 1 ? "are" : "is"} removed. `;
  return s + base;
}
