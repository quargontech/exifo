/**
 * The minimal EXIF block that carries only the orientation tag.
 * Written back when the full EXIF block is removed but the image needs
 * its orientation to display the right way up.
 */

import { readOrientation } from "./tiff";

export { readOrientation };

/** 26-byte big-endian TIFF block with one IFD0 entry: Orientation (0x0112) = `orientation`. */
export function minimalOrientationTiff(orientation: number): Uint8Array {
  if (!(orientation >= 1 && orientation <= 8)) throw new RangeError("Orientation must be 1–8");
  // prettier-ignore
  return new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 at offset 8
    0x00, 0x01, // 1 entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // tag 0x0112, SHORT, count 1
    0x00, orientation, 0x00, 0x00, // value
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
}

/** 36-byte JPEG APP1 segment: FF E1, length 34, "Exif\0\0", minimal TIFF. */
export function minimalOrientationApp1(orientation: number): Uint8Array {
  const tiff = minimalOrientationTiff(orientation);
  const seg = new Uint8Array(4 + 6 + tiff.length);
  seg.set([0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  seg.set(tiff, 10);
  return seg;
}

/** True when this orientation needs to be preserved (2–8). */
export const needsOrientation = (o: number) => o >= 2 && o <= 8;
