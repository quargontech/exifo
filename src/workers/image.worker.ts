/** Image worker: re-encoding tools. Codecs are loaded lazily on first use. */

import * as Comlink from "comlink";
import { encodeImage, optimizePngFile, type EncodeSettings } from "../lib/codecs";
import { processImage, renderPixels, type ProcessRequest, type ProcessResult } from "../lib/image-ops";

const api = {
  async process(req: ProcessRequest): Promise<ProcessResult> {
    const res = await processImage(req);
    return Comlink.transfer(res, [res.output]);
  },

  /** Decode (orientation applied) and encode as lossless PNG, e.g. to embed in a PDF. */
  async toPng(buffer: ArrayBuffer, mime: string): Promise<{ output: ArrayBuffer; width: number; height: number }> {
    const img = await renderPixels({ buffer, mime });
    const settings: EncodeSettings = { format: "png", quality: 100 };
    const output = await encodeImage(img, settings);
    return Comlink.transfer({ output, width: img.width, height: img.height }, [output]);
  },

  /** Lossless PNG optimisation without decoding to a canvas. */
  async optimizePng(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const out = await optimizePngFile(buffer);
    return Comlink.transfer(out, [out]);
  },

  /** Upright pixel size after orientation. */
  async probe(buffer: ArrayBuffer, mime: string): Promise<{ width: number; height: number }> {
    const bmp = await createImageBitmap(new Blob([buffer], { type: mime }), { imageOrientation: "from-image" });
    const r = { width: bmp.width, height: bmp.height };
    bmp.close();
    return r;
  },
};

export type ImageWorkerApi = typeof api;

Comlink.expose(api);
