/**
 * Build an XMP packet with common descriptive fields and wrap it for
 * JPEG (APP1), PNG (iTXt) or WebP ("XMP " chunk).
 */

import { concat, encodeUtf8, fromAscii, setU16be, setU32be, setU32le } from "./bytes";
import { crc32Parts } from "./crc32";
import { ExifoError } from "./types";

export interface DescriptiveFields {
  title?: string;
  description?: string;
  /** One or more creators. */
  creator?: string[];
  copyright?: string;
  credit?: string;
  keywords?: string[];
  /** ISO date, e.g. 2026-08-14 or 2026-08-14T17:42:09. */
  dateCreated?: string;
  /**
   * IPTC digital source type carried over from the file's existing XMP (for example the
   * trainedAlgorithmicMedia AI label), so writing new fields never drops it.
   */
  digitalSourceType?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const clean = (s?: string) => (s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

export function hasAnyField(f: DescriptiveFields): boolean {
  return !!(
    clean(f.title) ||
    clean(f.description) ||
    f.creator?.some((c) => clean(c)) ||
    clean(f.copyright) ||
    clean(f.credit) ||
    f.keywords?.some((k) => clean(k)) ||
    clean(f.dateCreated)
  );
}

export function buildXmpPacket(f: DescriptiveFields): string {
  const lines: string[] = [];
  const alt = (tag: string, v?: string) => {
    const s = clean(v);
    if (s) lines.push(`   <${tag}><rdf:Alt><rdf:li xml:lang="x-default">${esc(s)}</rdf:li></rdf:Alt></${tag}>`);
  };
  const list = (tag: string, kind: "Seq" | "Bag", values?: string[]) => {
    const vs = (values ?? []).map(clean).filter(Boolean);
    if (vs.length) lines.push(`   <${tag}><rdf:${kind}>${vs.map((v) => `<rdf:li>${esc(v)}</rdf:li>`).join("")}</rdf:${kind}></${tag}>`);
  };
  const simple = (tag: string, v?: string) => {
    const s = clean(v);
    if (s) lines.push(`   <${tag}>${esc(s)}</${tag}>`);
  };
  alt("dc:title", f.title);
  alt("dc:description", f.description);
  list("dc:creator", "Seq", f.creator);
  alt("dc:rights", f.copyright);
  list("dc:subject", "Bag", f.keywords);
  simple("photoshop:Credit", f.credit);
  simple("photoshop:DateCreated", f.dateCreated);
  simple("Iptc4xmpExt:DigitalSourceType", f.digitalSourceType);
  return [
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">`,
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `  <rdf:Description rdf:about=""`,
    `    xmlns:dc="http://purl.org/dc/elements/1.1/"`,
    `    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"`,
    `    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">`,
    ...lines,
    `  </rdf:Description>`,
    ` </rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("\n");
}

const XMP_NS = "http://ns.adobe.com/xap/1.0/\0";
/** Largest XMP packet that fits in one JPEG APP1 segment. */
export const MAX_JPEG_XMP = 65535 - 2 - XMP_NS.length;

export function buildXmpApp1(packet: string): Uint8Array {
  const data = encodeUtf8(packet);
  if (data.length > MAX_JPEG_XMP) throw new ExifoError("too-large", "The XMP packet is too large for one JPEG segment.");
  const head = new Uint8Array(4);
  head[0] = 0xff;
  head[1] = 0xe1;
  setU16be(head, 2, 2 + XMP_NS.length + data.length);
  return concat([head, fromAscii(XMP_NS), data]);
}

/** A complete PNG iTXt chunk (length, type, data, CRC) with keyword XML:com.adobe.xmp. */
export function buildXmpITXt(packet: string): Uint8Array {
  const data = concat([fromAscii("XML:com.adobe.xmp\0"), new Uint8Array([0, 0, 0, 0]), encodeUtf8(packet)]);
  return pngChunk("iTXt", data);
}

export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  setU32be(out, 0, data.length);
  const t = fromAscii(type);
  out.set(t, 4);
  out.set(data, 8);
  setU32be(out, 8 + data.length, crc32Parts(t, data));
  return out;
}

export function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const pad = data.length & 1;
  const out = new Uint8Array(8 + data.length + pad);
  out.set(fromAscii(fourcc), 0);
  setU32le(out, 4, data.length);
  out.set(data, 8);
  return out;
}

export const buildXmpWebpChunk = (packet: string) => riffChunk("XMP ", encodeUtf8(packet));

/** The software credit written to re-encoded image-tool output. Shown plainly in Inspect. */
export const CREDIT_SOFTWARE = "Exifo (https://exifo.app)";

/** A minimal XMP packet carrying only `xmp:CreatorTool`, used for the optional Exifo credit. */
export function buildCreditXmp(): string {
  return [
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">`,
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `  <rdf:Description rdf:about=""`,
    `    xmlns:xmp="http://ns.adobe.com/xap/1.0/">`,
    `   <xmp:CreatorTool>${esc(CREDIT_SOFTWARE)}</xmp:CreatorTool>`,
    `  </rdf:Description>`,
    ` </rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("\n");
}
