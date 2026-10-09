/**
 * Metadata worker: scan, report, lossless clean and verification run here so
 * the interface stays responsive. Buffers are transferred, not copied.
 */

import * as Comlink from "comlink";
import { analyze, type Analysis } from "../lib/report";
import { strip } from "../lib/strip";
import { comparePixels, imageDataHash, verifyImageData, type PixelCompareResult } from "../lib/verify";
import { scan } from "../lib/container";
import { composeOrientation, setJpegOrientation } from "../lib/orientation";
import { toArrayBuffer } from "../lib/bytes";
import type { StripOptions, StripResult } from "../lib/types";

const api = {
  async analyze(buf: ArrayBuffer): Promise<Analysis> {
    return analyze(new Uint8Array(buf));
  },

  async clean(buf: ArrayBuffer, opts: StripOptions): Promise<StripResult> {
    const res = await strip(new Uint8Array(buf), opts);
    return Comlink.transfer(res, [res.output]);
  },

  /** Lossless JPEG rotate/flip via the orientation tag. Verifies the image data is unchanged. */
  async reorient(buf: ArrayBuffer, rotate: 0 | 90 | 180 | 270, flipH: boolean, flipV: boolean): Promise<{ output: ArrayBuffer; orientation: number }> {
    const input = new Uint8Array(buf);
    const current = scan(input).orientation;
    const orientation = composeOrientation(current, rotate, flipH, flipV);
    const out = setJpegOrientation(input, orientation);
    if (!(await verifyImageData(input, out))) throw new Error("Could not rotate safely. Nothing was written.");
    const output = toArrayBuffer(out);
    return Comlink.transfer({ output, orientation }, [output]);
  },

  async imageHash(buf: ArrayBuffer): Promise<string> {
    return imageDataHash(new Uint8Array(buf));
  },

  async comparePixels(a: ArrayBuffer, b: ArrayBuffer, mime: string, width: number, height: number): Promise<PixelCompareResult> {
    return comparePixels(new Blob([a], { type: mime }), new Blob([b], { type: mime }), width, height);
  },
};

export type StripWorkerApi = typeof api;

Comlink.expose(api);
