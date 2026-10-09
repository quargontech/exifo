/** Decode PNG tEXt, zTXt and iTXt chunks for display. */

import { unzlibSync } from "fflate";
import { latin1, utf8 } from "./bytes";

export interface PngText {
  type: "tEXt" | "zTXt" | "iTXt";
  keyword: string;
  text: string;
  language?: string;
  /** Original length before truncation for display. */
  length: number;
}

const MAX_COMPRESSED = 8 * 1024 * 1024;
const MAX_TEXT = 200_000;

function inflate(b: Uint8Array): Uint8Array | null {
  if (b.length > MAX_COMPRESSED) return null;
  try {
    return unzlibSync(b);
  } catch {
    return null;
  }
}

export function decodePngText(type: string, data: Uint8Array): PngText | null {
  const z = data.indexOf(0);
  if (z <= 0 || z > 79) return null;
  const keyword = latin1(data.subarray(0, z));
  let text: string;
  let language: string | undefined;
  if (type === "tEXt") text = latin1(data.subarray(z + 1));
  else if (type === "zTXt") {
    const raw = inflate(data.subarray(z + 2));
    text = raw ? latin1(raw) : "(compressed text could not be read)";
  } else if (type === "iTXt") {
    const compressed = data[z + 1] === 1;
    const langEnd = data.indexOf(0, z + 3);
    if (langEnd < 0) return null;
    const trEnd = data.indexOf(0, langEnd + 1);
    if (trEnd < 0) return null;
    language = latin1(data.subarray(z + 3, langEnd)) || undefined;
    const body = data.subarray(trEnd + 1);
    const raw = compressed ? inflate(body) : body;
    text = raw ? utf8(raw) : "(compressed text could not be read)";
  } else return null;
  const length = text.length;
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  return { type, keyword, text, language, length };
}
