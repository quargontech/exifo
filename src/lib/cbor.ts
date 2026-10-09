/** Small CBOR (RFC 8949) decoder for reading C2PA claims and assertions. */

export class Tagged {
  constructor(
    public tag: number,
    public value: CborValue,
  ) {}
}

export type CborValue = number | bigint | string | boolean | null | undefined | Uint8Array | CborValue[] | { [key: string]: CborValue } | Tagged;

const BREAK = Symbol("break");
const decoder = new TextDecoder();

export function decodeCbor(b: Uint8Array, maxDepth = 64): CborValue {
  let p = 0;
  const need = (n: number) => {
    if (p + n > b.length) throw new Error("CBOR: unexpected end");
  };
  const readLen = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) {
      need(1);
      return b[p++];
    }
    if (info === 25) {
      need(2);
      const v = (b[p] << 8) | b[p + 1];
      p += 2;
      return v;
    }
    if (info === 26) {
      need(4);
      const v = ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];
      p += 4;
      return v;
    }
    if (info === 27) {
      need(8);
      const hi = ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];
      const lo = ((b[p + 4] << 24) >>> 0) + (b[p + 5] << 16) + (b[p + 6] << 8) + b[p + 7];
      p += 8;
      return hi * 2 ** 32 + lo;
    }
    if (info === 31) return -1; // indefinite
    throw new Error("CBOR: bad length");
  };
  const half = (v: number) => {
    const exp = (v >> 10) & 0x1f;
    const mant = v & 0x3ff;
    const sign = v & 0x8000 ? -1 : 1;
    if (exp === 0) return sign * 2 ** -14 * (mant / 1024);
    if (exp === 31) return mant ? NaN : sign * Infinity;
    return sign * 2 ** (exp - 15) * (1 + mant / 1024);
  };
  const item = (depth: number): CborValue | typeof BREAK => {
    if (depth > maxDepth) throw new Error("CBOR: too deep");
    need(1);
    const ib = b[p++];
    const major = ib >> 5;
    const info = ib & 0x1f;
    switch (major) {
      case 0:
        return readLen(info);
      case 1:
        return -1 - readLen(info);
      case 2:
      case 3: {
        const len = readLen(info);
        let bytes: Uint8Array;
        if (len < 0) {
          const parts: Uint8Array[] = [];
          for (;;) {
            const x = item(depth + 1);
            if (x === BREAK) break;
            parts.push(typeof x === "string" ? new TextEncoder().encode(x) : (x as Uint8Array));
          }
          const total = parts.reduce((s, x) => s + x.length, 0);
          bytes = new Uint8Array(total);
          let o = 0;
          for (const x of parts) {
            bytes.set(x, o);
            o += x.length;
          }
        } else {
          need(len);
          bytes = b.subarray(p, p + len);
          p += len;
        }
        return major === 2 ? bytes : decoder.decode(bytes);
      }
      case 4: {
        const len = readLen(info);
        const arr: CborValue[] = [];
        for (let i = 0; len < 0 || i < len; i++) {
          const x = item(depth + 1);
          if (x === BREAK) break;
          arr.push(x);
        }
        return arr;
      }
      case 5: {
        const len = readLen(info);
        const obj: { [key: string]: CborValue } = {};
        for (let i = 0; len < 0 || i < len; i++) {
          const k = item(depth + 1);
          if (k === BREAK) break;
          const v = item(depth + 1);
          obj[String(k)] = v as CborValue;
        }
        return obj;
      }
      case 6:
        return new Tagged(readLen(info), item(depth + 1) as CborValue);
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        if (info === 23) return undefined;
        if (info === 25) {
          need(2);
          const v = half((b[p] << 8) | b[p + 1]);
          p += 2;
          return v;
        }
        if (info === 26) {
          need(4);
          const v = new DataView(b.buffer, b.byteOffset + p, 4).getFloat32(0);
          p += 4;
          return v;
        }
        if (info === 27) {
          need(8);
          const v = new DataView(b.buffer, b.byteOffset + p, 8).getFloat64(0);
          p += 8;
          return v;
        }
        if (info === 31) return BREAK;
        if (info === 24) {
          need(1);
          p++;
        }
        return undefined;
    }
    throw new Error("CBOR: bad item");
  };
  const v = item(0);
  if (v === BREAK) throw new Error("CBOR: unexpected break");
  return v;
}

/** Strip tags and return the inner value. */
export const untag = (v: CborValue): CborValue => (v instanceof Tagged ? untag(v.value) : v);
