/**
 * Lightweight Content Credentials (C2PA) reader. Walks the JUMBF boxes and
 * decodes the claim, actions and signer certificate subject, so a file can be
 * labelled without loading the full SDK. It does NOT validate signatures;
 * the Check tool uses the official c2pa-web SDK for that.
 */

import { ascii, u32be, utf8 } from "./bytes";
import { decodeCbor, Tagged, untag, type CborValue } from "./cbor";

export interface JumbfBox {
  type: string;
  label?: string;
  /** First four bytes of the description UUID, e.g. "c2pa", "c2ma", "cbor". */
  kind?: string;
  children: JumbfBox[];
  data?: Uint8Array;
}

function readBoxes(b: Uint8Array, start: number, end: number, depth = 0): JumbfBox[] {
  const out: JumbfBox[] = [];
  let p = start;
  while (p + 8 <= end) {
    let size = u32be(b, p);
    const type = ascii(b, p + 4, 4);
    let head = 8;
    if (size === 1) {
      if (p + 16 > end) break;
      size = u32be(b, p + 8) * 2 ** 32 + u32be(b, p + 12);
      head = 16;
    } else if (size === 0) size = end - p;
    if (size < head || p + size > end) break;
    const dStart = p + head;
    const dEnd = p + size;
    if (type === "jumb" && depth < 16) {
      const kids = readBoxes(b, dStart, dEnd, depth + 1);
      const box: JumbfBox = { type, children: kids.slice(1) };
      const d = kids[0];
      if (d?.type === "jumd" && d.data && d.data.length >= 17) {
        box.kind = ascii(d.data, 0, 4);
        const toggles = d.data[16];
        if (toggles & 0x02) {
          const z = d.data.indexOf(0, 17);
          box.label = utf8(d.data.subarray(17, z < 0 ? d.data.length : z));
        }
      }
      out.push(box);
    } else out.push({ type, children: [], data: b.subarray(dStart, dEnd) });
    p = dEnd;
  }
  return out;
}

export const parseJumbf = (b: Uint8Array) => readBoxes(b, 0, b.length);

/* ------------------------------------------------------------- DER helpers */

interface Tlv {
  tag: number;
  start: number;
  end: number;
}

function tlv(b: Uint8Array, p: number, end: number): Tlv | null {
  if (p + 2 > end) return null;
  const tag = b[p];
  let len = b[p + 1];
  let q = p + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4 || q + n > end) return null;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[q + i];
    q += n;
  }
  if (q + len > end) return null;
  return { tag, start: q, end: q + len };
}

function children(b: Uint8Array, t: Tlv): Tlv[] {
  const out: Tlv[] = [];
  let p = t.start;
  while (p < t.end) {
    const c = tlv(b, p, t.end);
    if (!c) break;
    out.push(c);
    p = c.end;
  }
  return out;
}

/** Subject organisation and common name of an X.509 certificate. */
export function certSubject(cert: Uint8Array): { org?: string; cn?: string } {
  try {
    const top = tlv(cert, 0, cert.length);
    if (!top) return {};
    const tbs = children(cert, top)[0];
    if (!tbs) return {};
    const parts = children(cert, tbs);
    const i = parts[0]?.tag === 0xa0 ? 1 : 0;
    const subject = parts[i + 4];
    if (!subject) return {};
    const res: { org?: string; cn?: string } = {};
    for (const set of children(cert, subject)) {
      for (const atv of children(cert, set)) {
        const [o, v] = children(cert, atv);
        if (!o || !v) continue;
        const oid = Array.from(cert.subarray(o.start, o.end)).join(".");
        const value = utf8(cert.subarray(v.start, v.end));
        if (oid === "85.4.10") res.org = value;
        if (oid === "85.4.3") res.cn = value;
      }
    }
    return res;
  } catch {
    return {};
  }
}

/** First GeneralizedTime in a DER structure (the genTime of an RFC 3161 token). */
export function findGeneralizedTime(b: Uint8Array, depth = 0): string | undefined {
  if (depth > 12) return undefined;
  let p = 0;
  while (p < b.length) {
    const t = tlv(b, p, b.length);
    if (!t) return undefined;
    if (t.tag === 0x18) {
      const s = ascii(b, t.start, t.end - t.start);
      const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(s);
      if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
    }
    if (t.tag & 0x20 || t.tag === 0x04) {
      const inner = findGeneralizedTime(b.subarray(t.start, t.end), depth + 1);
      if (inner) return inner;
    }
    p = t.end;
  }
  return undefined;
}

/* ------------------------------------------------------------- summary */

export interface C2paAction {
  action: string;
  label: string;
  softwareAgent?: string;
  digitalSourceType?: string;
}

export interface C2paSummary {
  manifests: number;
  claimGenerator?: string;
  title?: string;
  format?: string;
  signer?: string;
  signerCommonName?: string;
  signedAt?: string;
  actions: C2paAction[];
  digitalSourceTypes: string[];
  ingredients: number;
  aiGenerated: boolean;
  aiEdited: boolean;
  error?: string;
}

const ACTION_LABELS: Record<string, string> = {
  "c2pa.created": "Created",
  "c2pa.opened": "Opened",
  "c2pa.edited": "Edited",
  "c2pa.placed": "Placed",
  "c2pa.resized": "Resized",
  "c2pa.cropped": "Cropped",
  "c2pa.color_adjustments": "Colour adjustments",
  "c2pa.converted": "Converted",
  "c2pa.drawing": "Drawing",
  "c2pa.filtered": "Filtered",
  "c2pa.orientation": "Orientation changed",
  "c2pa.published": "Published",
  "c2pa.transcoded": "Transcoded",
  "c2pa.repackaged": "Repackaged",
  "c2pa.removed": "Removed",
  "c2pa.redacted": "Redacted",
  "c2pa.watermarked": "Watermarked",
};

export function actionLabel(a: string): string {
  if (ACTION_LABELS[a]) return ACTION_LABELS[a];
  const s = a.replace(/^c2pa\./, "").replace(/[._]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Short name of an IPTC digital source type URI. */
export const shortSourceType = (uri: string) => uri.replace(/^.*[/#]/, "");

export const isAiGeneratedType = (t: string) => /(^|[/#])(trainedAlgorithmicMedia|algorithmicMedia)$/.test(t.trim());
export const isAiEditedType = (t: string) => /(^|[/#])compositeWithTrainedAlgorithmicMedia$/.test(t.trim());

const asObj = (v: CborValue): Record<string, CborValue> | null =>
  v && typeof v === "object" && !(v instanceof Uint8Array) && !Array.isArray(v) && !(v instanceof Tagged) ? (v as Record<string, CborValue>) : null;
const asStr = (v: CborValue): string | undefined => (typeof v === "string" ? v : undefined);

function agentName(v: CborValue): string | undefined {
  if (typeof v === "string") return v;
  const o = asObj(v);
  if (!o) return undefined;
  const name = asStr(o.name);
  const version = asStr(o.version);
  return name ? (version && !name.includes(version) ? `${name} ${version}` : name) : undefined;
}

function contentOf(box: JumbfBox): CborValue | undefined {
  for (const c of box.children) {
    if (c.type === "cbor" && c.data) {
      try {
        return decodeCbor(c.data);
      } catch {
        return undefined;
      }
    }
    if (c.type === "json" && c.data) {
      try {
        return JSON.parse(utf8(c.data)) as CborValue;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const byLabel = (boxes: JumbfBox[], prefix: string) =>
  boxes.filter((b) => b.label === prefix || b.label?.startsWith(prefix + "__") || b.label?.startsWith(prefix + ".v"));

export function summarizeC2pa(jumbf: Uint8Array): C2paSummary {
  const summary: C2paSummary = { manifests: 0, actions: [], digitalSourceTypes: [], ingredients: 0, aiGenerated: false, aiEdited: false };
  try {
    const store = parseJumbf(jumbf).find((b) => b.type === "jumb" && (b.label === "c2pa" || b.kind === "c2pa"));
    if (!store) {
      summary.error = "No manifest store found";
      return summary;
    }
    const manifests = store.children.filter((c) => c.type === "jumb");
    summary.manifests = manifests.length;
    const active = manifests[manifests.length - 1];
    if (!active) return summary;

    const claimBox = active.children.find((c) => c.label?.startsWith("c2pa.claim"));
    const claim = claimBox ? asObj(untag(contentOf(claimBox) ?? null)) : null;
    if (claim) {
      const info = claim.claim_generator_info;
      const infoName = Array.isArray(info) ? agentName(info[0]) : agentName(info ?? null);
      summary.claimGenerator = asStr(claim.claim_generator) ?? infoName;
      summary.title = asStr(claim["dc:title"]) ?? asStr(claim.title);
      summary.format = asStr(claim["dc:format"]);
    }

    const assertionStore = active.children.find((c) => c.label === "c2pa.assertions");
    const assertions = assertionStore?.children ?? [];
    for (const box of byLabel(assertions, "c2pa.actions")) {
      const content = asObj(untag(contentOf(box) ?? null));
      const list = content?.actions;
      if (!Array.isArray(list)) continue;
      for (const a of list) {
        const o = asObj(a);
        const action = o && asStr(o.action);
        if (!o || !action) continue;
        const params = asObj(o.parameters ?? null);
        const dst = asStr(o.digitalSourceType) ?? (params ? asStr(params.digitalSourceType) : undefined);
        summary.actions.push({ action, label: actionLabel(action), softwareAgent: agentName(o.softwareAgent ?? null), digitalSourceType: dst });
        if (dst && !summary.digitalSourceTypes.includes(dst)) summary.digitalSourceTypes.push(dst);
        if (dst && isAiGeneratedType(dst)) {
          if (action === "c2pa.created") summary.aiGenerated = true;
          else summary.aiEdited = true;
        }
        if (dst && isAiEditedType(dst)) summary.aiEdited = true;
      }
    }
    summary.ingredients = byLabel(assertions, "c2pa.ingredient").length;
    if (!summary.claimGenerator) summary.claimGenerator = summary.actions.find((a) => a.softwareAgent)?.softwareAgent;

    const sigBox = active.children.find((c) => c.label === "c2pa.signature");
    const sig = sigBox ? contentOf(sigBox) : undefined;
    const arr = sig !== undefined ? untag(sig) : null;
    if (Array.isArray(arr) && arr.length >= 2) {
      let headers: Record<string, CborValue> = {};
      if (arr[0] instanceof Uint8Array && arr[0].length) {
        try {
          headers = asObj(decodeCbor(arr[0])) ?? {};
        } catch {
          /* ignore */
        }
      }
      const unprotected = asObj(arr[1]) ?? {};
      const chain = headers["33"] ?? unprotected["33"] ?? unprotected.x5chain;
      const cert = chain instanceof Uint8Array ? chain : Array.isArray(chain) && chain[0] instanceof Uint8Array ? chain[0] : null;
      if (cert) {
        const subj = certSubject(cert);
        summary.signer = subj.org ?? subj.cn;
        summary.signerCommonName = subj.cn;
      }
      const tst = asObj(unprotected.sigTst ?? unprotected.sigTst2 ?? null);
      const tokens = tst?.tstTokens;
      const token = Array.isArray(tokens) ? asObj(tokens[0]) : null;
      if (token?.val instanceof Uint8Array) summary.signedAt = findGeneralizedTime(token.val);
    }
  } catch (err) {
    summary.error = err instanceof Error ? err.message : "Could not read the manifest";
  }
  return summary;
}
