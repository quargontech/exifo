/** Small, dependency-free helpers for reading and writing binary data. */

export const toU8 = (buf: ArrayBuffer | Uint8Array): Uint8Array => (buf instanceof Uint8Array ? buf : new Uint8Array(buf));

export const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
export const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
export const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
export const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
export const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + ((b[o + 3] << 24) >>> 0);

export function setU16be(b: Uint8Array, o: number, v: number) {
  b[o] = (v >>> 8) & 0xff;
  b[o + 1] = v & 0xff;
}
export function setU32be(b: Uint8Array, o: number, v: number) {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
}
export function setU24le(b: Uint8Array, o: number, v: number) {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
}
export function setU32le(b: Uint8Array, o: number, v: number) {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
  b[o + 3] = (v >>> 24) & 0xff;
}

/** Read `n` bytes as Latin-1 / ASCII. */
export function ascii(b: Uint8Array, o: number, n: number): string {
  let s = "";
  const end = Math.min(b.length, o + n);
  for (let i = o; i < end; i++) s += String.fromCharCode(b[i]);
  return s;
}

/** True when the bytes at `o` equal `sig` (a string of Latin-1 chars or a byte list). */
export function bytesEqual(b: Uint8Array, o: number, sig: string | ArrayLike<number>): boolean {
  if (o < 0 || o + sig.length > b.length) return false;
  for (let i = 0; i < sig.length; i++) {
    const c = typeof sig === "string" ? sig.charCodeAt(i) : sig[i];
    if (b[o + i] !== c) return false;
  }
  return true;
}

export function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const fromAscii = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

const utf8Decoder = /* @__PURE__ */ new TextDecoder("utf-8", { fatal: false });
const latin1Decoder = /* @__PURE__ */ new TextDecoder("latin1");
export const utf8 = (b: Uint8Array) => utf8Decoder.decode(b);
export const latin1 = (b: Uint8Array) => latin1Decoder.decode(b);
export const encodeUtf8 = (s: string) => new TextEncoder().encode(s);

/** Index of the first zero byte at or after `o`, or -1. */
export const indexOfZero = (b: Uint8Array, o: number, end = b.length) => {
  const i = b.indexOf(0, o);
  return i === -1 || i >= end ? -1 : i;
};

/** A NUL-terminated printable identifier at the start of an APPn payload, for display. */
export function identAt(b: Uint8Array, o: number, max = 24): string {
  let s = "";
  for (let i = o; i < Math.min(b.length, o + max); i++) {
    const c = b[i];
    if (c === 0) break;
    if (c < 0x20 || c > 0x7e) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export const toHex = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
};

/** Copy into a fresh, exactly-sized ArrayBuffer (safe to transfer). */
export function toArrayBuffer(b: Uint8Array): ArrayBuffer {
  if (b.byteOffset === 0 && b.byteLength === b.buffer.byteLength && b.buffer instanceof ArrayBuffer) {
    return b.buffer;
  }
  return b.slice().buffer as ArrayBuffer;
}
