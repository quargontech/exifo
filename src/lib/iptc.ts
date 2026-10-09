/** Photoshop Image Resource Blocks and the IPTC-IIM records inside them (JPEG APP13). */

import { ascii, latin1, u16be, u32be, utf8 } from "./bytes";

const DATASETS: Record<string, string> = {
  "1:90": "CodedCharacterSet",
  "2:0": "RecordVersion",
  "2:3": "ObjectTypeReference",
  "2:5": "ObjectName",
  "2:7": "EditStatus",
  "2:10": "Urgency",
  "2:12": "SubjectReference",
  "2:15": "Category",
  "2:20": "SupplementalCategories",
  "2:22": "FixtureIdentifier",
  "2:25": "Keywords",
  "2:26": "ContentLocationCode",
  "2:27": "ContentLocationName",
  "2:30": "ReleaseDate",
  "2:35": "ReleaseTime",
  "2:37": "ExpirationDate",
  "2:38": "ExpirationTime",
  "2:40": "SpecialInstructions",
  "2:42": "ActionAdvised",
  "2:45": "ReferenceService",
  "2:47": "ReferenceDate",
  "2:50": "ReferenceNumber",
  "2:55": "DateCreated",
  "2:60": "TimeCreated",
  "2:62": "DigitalCreationDate",
  "2:63": "DigitalCreationTime",
  "2:65": "OriginatingProgram",
  "2:70": "ProgramVersion",
  "2:75": "ObjectCycle",
  "2:80": "By-line",
  "2:85": "By-lineTitle",
  "2:90": "City",
  "2:92": "Sub-location",
  "2:95": "Province-State",
  "2:100": "Country-PrimaryLocationCode",
  "2:101": "Country-PrimaryLocationName",
  "2:103": "OriginalTransmissionReference",
  "2:105": "Headline",
  "2:110": "Credit",
  "2:115": "Source",
  "2:116": "CopyrightNotice",
  "2:118": "Contact",
  "2:120": "Caption-Abstract",
  "2:121": "LocalCaption",
  "2:122": "Writer-Editor",
  "2:130": "ImageType",
  "2:131": "ImageOrientation",
  "2:135": "LanguageIdentifier",
};

const RESOURCE_NAMES: Record<number, string> = {
  0x03ed: "Resolution info",
  0x0404: "IPTC-NAA record",
  0x0406: "JPEG quality",
  0x0409: "Thumbnail (Photoshop 4)",
  0x040c: "Thumbnail",
  0x040f: "ICC profile",
  0x0422: "EXIF data",
  0x0424: "XMP",
  0x0425: "IPTC digest",
  0x0426: "Print scale",
  0x043a: "Print information",
  0x043b: "Print style",
};

export interface IptcResult {
  /** [name, value] in file order; repeated datasets are joined with ", ". */
  fields: [string, string][];
  resources: string[];
  hasThumbnail: boolean;
}

function decodeText(b: Uint8Array, forceUtf8: boolean): string {
  if (forceUtf8) return utf8(b);
  const s = utf8(b);
  return s.includes("�") ? latin1(b) : s;
}

function parseIim(b: Uint8Array): [string, string][] {
  const out = new Map<string, string[]>();
  let p = 0;
  let isUtf8 = false;
  while (p + 5 <= b.length) {
    if (b[p] !== 0x1c) {
      p++;
      continue;
    }
    const rec = b[p + 1];
    const ds = b[p + 2];
    let len = u16be(b, p + 3);
    let q = p + 5;
    if (len & 0x8000) {
      const n = len & 0x7fff;
      if (n > 4 || q + n > b.length) break;
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + b[q + i];
      q += n;
    }
    if (q + len > b.length) break;
    const data = b.subarray(q, q + len);
    const key = `${rec}:${ds}`;
    if (key === "1:90") isUtf8 = ascii(data, 0, data.length).includes("%G");
    const name = DATASETS[key] ?? `Dataset ${key}`;
    if (rec === 2 && ds !== 0) {
      const v = decodeText(data, isUtf8).replace(/\0+$/, "").trim();
      if (v) out.set(name, [...(out.get(name) ?? []), v]);
    }
    p = q + len;
  }
  return [...out].map(([k, v]) => [k, v.join(", ")]);
}

/** `b` is the payload after the "Photoshop 3.0\0" header (all APP13 segments concatenated). */
export function parseIrb(b: Uint8Array): IptcResult {
  const result: IptcResult = { fields: [], resources: [], hasThumbnail: false };
  let p = 0;
  while (p + 12 <= b.length) {
    const sig = ascii(b, p, 4);
    if (sig !== "8BIM" && sig !== "MeSa" && sig !== "PHUT" && sig !== "AgHg" && sig !== "DCSR") break;
    const id = u16be(b, p + 4);
    const nameLen = b[p + 6];
    let q = p + 7 + nameLen;
    if ((nameLen + 1) & 1) q++;
    if (q + 4 > b.length) break;
    const size = u32be(b, q);
    q += 4;
    if (q + size > b.length) break;
    const data = b.subarray(q, q + size);
    result.resources.push(RESOURCE_NAMES[id] ?? `Resource 0x${id.toString(16).padStart(4, "0")}`);
    if (id === 0x0404) result.fields.push(...parseIim(data));
    if (id === 0x040c || id === 0x0409) result.hasThumbnail = true;
    p = q + size + (size & 1);
  }
  return result;
}
