/** Streamed ZIP in store mode (images are already compressed). */

import { Zip, ZipPassThrough } from "fflate";
import { uniqueNames } from "./rename";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
  lastModified?: number;
}

export function makeZip(entries: ZipEntry[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = [];
    const zip = new Zip((err, chunk, final) => {
      if (err) return reject(err);
      parts.push(chunk);
      if (final) resolve(new Blob(parts as BlobPart[], { type: "application/zip" }));
    });
    const names = uniqueNames(entries.map((e) => e.name));
    entries.forEach((e, i) => {
      const f = new ZipPassThrough(names[i]);
      if (e.lastModified) f.mtime = e.lastModified;
      zip.add(f);
      f.push(e.data, true);
    });
    zip.end();
  });
}
