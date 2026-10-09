/** ICC colour profile summary: description, colour space, version. */

import { ascii, u32be } from "./bytes";

export interface IccSummary {
  description?: string;
  copyright?: string;
  colorSpace: string;
  deviceClass: string;
  version: string;
  size: number;
}

const CLASSES: Record<string, string> = {
  scnr: "Input device",
  mntr: "Display",
  prtr: "Output device",
  link: "Device link",
  spac: "Colour space",
  abst: "Abstract",
  nmcl: "Named colour",
};

const SPACES: Record<string, string> = {
  "RGB ": "RGB",
  GRAY: "Greyscale",
  CMYK: "CMYK",
  "Lab ": "Lab",
  "XYZ ": "XYZ",
  YCbr: "YCbCr",
};

function readText(b: Uint8Array, off: number, size: number): string | undefined {
  if (off + 12 > b.length) return undefined;
  const type = ascii(b, off, 4);
  if (type === "desc") {
    const n = u32be(b, off + 8);
    return (
      ascii(b, off + 12, Math.min(n, size - 12))
        .replace(/\0.*$/s, "")
        .trim() || undefined
    );
  }
  if (type === "text")
    return (
      ascii(b, off + 8, size - 8)
        .replace(/\0.*$/s, "")
        .trim() || undefined
    );
  if (type === "mluc") {
    const count = u32be(b, off + 8);
    if (!count) return undefined;
    const rec = off + 16;
    const len = u32be(b, rec + 4);
    const strOff = off + u32be(b, rec + 8);
    if (strOff + len > b.length) return undefined;
    let s = "";
    for (let i = 0; i + 1 < len; i += 2) s += String.fromCharCode((b[strOff + i] << 8) | b[strOff + i + 1]);
    return s.replace(/\0+$/, "").trim() || undefined;
  }
  return undefined;
}

export function parseIcc(b: Uint8Array): IccSummary | null {
  if (b.length < 132 || ascii(b, 36, 4) !== "acsp") return null;
  const major = b[8];
  const minor = b[9] >> 4;
  const summary: IccSummary = {
    colorSpace: SPACES[ascii(b, 16, 4)] ?? ascii(b, 16, 4).trim(),
    deviceClass: CLASSES[ascii(b, 12, 4)] ?? ascii(b, 12, 4),
    version: `${major}.${minor}`,
    size: b.length,
  };
  const count = Math.min(u32be(b, 128), 200);
  for (let i = 0; i < count; i++) {
    const e = 132 + i * 12;
    if (e + 12 > b.length) break;
    const sig = ascii(b, e, 4);
    const off = u32be(b, e + 4);
    const size = u32be(b, e + 8);
    if (sig === "desc") summary.description = readText(b, off, size);
    if (sig === "cprt") summary.copyright = readText(b, off, size);
  }
  return summary;
}
