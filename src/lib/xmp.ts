/** Read XMP properties into a flat list with canonical namespace prefixes. */

import { findAll, parseXml, type XNode } from "./xml-lite";

const CANONICAL: Record<string, string> = {
  "http://purl.org/dc/elements/1.1/": "dc",
  "http://ns.adobe.com/xap/1.0/": "xmp",
  "http://ns.adobe.com/xap/1.0/mm/": "xmpMM",
  "http://ns.adobe.com/xap/1.0/rights/": "xmpRights",
  "http://ns.adobe.com/xap/1.0/sType/ResourceEvent#": "stEvt",
  "http://ns.adobe.com/xap/1.0/sType/ResourceRef#": "stRef",
  "http://ns.adobe.com/photoshop/1.0/": "photoshop",
  "http://iptc.org/std/Iptc4xmpExt/2008-02-29/": "Iptc4xmpExt",
  "http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/": "Iptc4xmpCore",
  "http://ns.adobe.com/exif/1.0/": "exif",
  "http://cipa.jp/exif/1.0/": "exifEX",
  "http://ns.adobe.com/exif/1.0/aux/": "aux",
  "http://ns.adobe.com/tiff/1.0/": "tiff",
  "http://ns.adobe.com/camera-raw-settings/1.0/": "crs",
  "http://ns.useplus.org/ldf/xmp/1.0/": "plus",
  "http://ns.google.com/photos/1.0/camera/": "GCamera",
  "http://ns.google.com/photos/1.0/container/": "Container",
  "http://ns.google.com/photos/1.0/container/item/": "Item",
  "http://ns.adobe.com/hdr-gain-map/1.0/": "hdrgm",
  "http://ns.adobe.com/xmp/note/": "xmpNote",
  "http://ns.adobe.com/pdf/1.3/": "pdf",
};

export interface XmpProp {
  /** Canonical qualified name, e.g. "Iptc4xmpExt:DigitalSourceType" or "xmpMM:History". */
  qname: string;
  /** Local name, e.g. "DigitalSourceType". */
  name: string;
  value: string;
}

const RDF = "rdf:";

function canonicalName(qname: string, ns: Record<string, string>): string {
  const i = qname.indexOf(":");
  if (i < 0) return qname;
  const prefix = qname.slice(0, i);
  const uri = ns[prefix];
  const canon = uri ? CANONICAL[uri] : undefined;
  return canon ? `${canon}:${qname.slice(i + 1)}` : qname;
}

const localName = (q: string) => q.slice(q.indexOf(":") + 1);

function structSummary(node: XNode): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(node.attrs)) {
    if (k.startsWith(RDF) || k === "xml:lang") continue;
    parts.push(`${localName(k)}: ${v}`);
  }
  for (const c of node.children) {
    if (c.name === "rdf:Description") {
      parts.push(structSummary(c));
      continue;
    }
    const v = valueOf(c);
    if (v) parts.push(`${localName(c.name)}: ${v}`);
  }
  return parts.join(", ");
}

function valueOf(node: XNode): string {
  if (node.attrs["rdf:resource"]) return node.attrs["rdf:resource"];
  const container = node.children.find((c) => c.name === "rdf:Seq" || c.name === "rdf:Bag" || c.name === "rdf:Alt");
  if (container) {
    const items = container.children.filter((c) => c.name === "rdf:li");
    if (container.name === "rdf:Alt") {
      const def = items.find((li) => li.attrs["xml:lang"] === "x-default") ?? items[0];
      return def ? itemValue(def) : "";
    }
    return items.map(itemValue).filter(Boolean).join("; ");
  }
  const hasStruct =
    node.attrs["rdf:parseType"] === "Resource" || node.children.length > 0 || Object.keys(node.attrs).some((k) => !k.startsWith(RDF) && k !== "xml:lang");
  if (hasStruct) return structSummary(node);
  return node.text.trim();
}

function itemValue(li: XNode): string {
  const s = li.children.length || Object.keys(li.attrs).some((k) => !k.startsWith(RDF) && k !== "xml:lang") ? structSummary(li) : "";
  return s || li.text.trim();
}

export function parseXmp(xml: string): XmpProp[] {
  const props: XmpProp[] = [];
  let root: XNode;
  try {
    root = parseXml(xml);
  } catch {
    return props;
  }
  // Only top-level descriptions; ones nested inside a property are struct values handled by valueOf().
  const descriptions = findAll(root, "rdf:RDF").flatMap((rdf) => rdf.children.filter((c) => c.name === "rdf:Description"));
  for (const desc of descriptions) {
    for (const [k, v] of Object.entries(desc.attrs)) {
      if (k.startsWith(RDF) || k === "xml:lang") continue;
      const qname = canonicalName(k, desc.ns);
      props.push({ qname, name: localName(qname), value: v });
    }
    for (const c of desc.children) {
      if (c.name.startsWith(RDF)) continue;
      const qname = canonicalName(c.name, c.ns);
      props.push({ qname, name: localName(qname), value: valueOf(c) });
    }
  }
  // The same property can appear in the main and the extended packet.
  const seen = new Set<string>();
  return props.filter((p) => {
    const key = `${p.qname}\u0000${p.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const xmpGet = (props: XmpProp[], qname: string) => props.find((p) => p.qname === qname)?.value;

/** XMP GPS coordinate "48,51.504N" or "48,51,30.24N" to decimal degrees. */
export function xmpCoordinate(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^\s*(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?(?:,(\d+(?:\.\d+)?))?\s*([NSEW])?\s*$/i.exec(v);
  if (!m) return undefined;
  let deg = parseFloat(m[1]) + (m[2] ? parseFloat(m[2]) / 60 : 0) + (m[3] ? parseFloat(m[3]) / 3600 : 0);
  if (m[4] && /[SW]/i.test(m[4])) deg = -deg;
  return Number.isFinite(deg) ? deg : undefined;
}

/** Location-like property names, removed from XMP when the user removes location. */
export const isLocationProp = (qname: string) => /:(GPS|Gps)\w*$|:\w*(Latitude|Longitude|Altitude)$/.test(qname);

/** Remove properties matching `test` from an XMP packet (attributes and elements). */
export function removeXmpProps(xml: string, test: (qname: string) => boolean): { xml: string; removed: number } {
  let removed = 0;
  let out = xml.replace(/\s+([A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*)\s*=\s*("[^"]*"|'[^']*')/g, (m, q: string) => {
    if (q.startsWith("xmlns:") || q.startsWith("rdf:") || !test(q)) return m;
    removed++;
    return "";
  });
  out = out.replace(/<([A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*)\b[^>]*?\/>/g, (m, q: string) => {
    if (q.startsWith("rdf:") || !test(q)) return m;
    removed++;
    return "";
  });
  out = out.replace(/<([A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*)\b[^>]*>[\s\S]*?<\/\1>/g, (m, q: string) => {
    if (q.startsWith("rdf:") || q.startsWith("x:") || !test(q)) return m;
    removed++;
    return "";
  });
  return { xml: out, removed };
}
