/** Table-based CRC-32 (ISO 3309 / PNG), used when a PNG chunk is written or changed. */

let TABLE: Uint32Array | null = null;

function table(): Uint32Array {
  if (TABLE) return TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  TABLE = t;
  return t;
}

export function crc32(data: Uint8Array, crc = 0): number {
  const t = table();
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** CRC over several parts as if they were one buffer (PNG: type + data). */
export function crc32Parts(...parts: Uint8Array[]): number {
  let c = 0;
  for (const p of parts) c = crc32(p, c);
  return c;
}
