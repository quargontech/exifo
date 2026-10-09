/** The full lossless clean: rebuild the container, then prove the image data is unchanged. */

import { toArrayBuffer } from "./bytes";
import { scan, stripContainer } from "./container";
import { verifyImageData } from "./verify";
import { ALL_BLOCK_KINDS, ExifoError, type StripOptions, type StripResult } from "./types";

export const DEFAULT_STRIP_OPTIONS: StripOptions = { remove: [...ALL_BLOCK_KINDS], keepOrientation: true };

export async function strip(input: Uint8Array, opts: StripOptions = DEFAULT_STRIP_OPTIONS): Promise<StripResult> {
  const before = scan(input);
  const res = stripContainer(input, opts);
  let identical = false;
  try {
    identical = await verifyImageData(input, res.output);
  } catch (err) {
    console.error("Exifo: output failed to re-parse", err);
    throw new ExifoError("unsafe", "Could not clean safely. Nothing was written.");
  }
  if (!identical) {
    console.error("Exifo: image-data hash mismatch", { format: before.format, opts });
    throw new ExifoError("unsafe", "Could not clean safely. Nothing was written.");
  }
  const removedSet = new Set(res.removedIds);
  return {
    output: toArrayBuffer(res.output),
    removed: before.blocks.filter((b) => removedSet.has(b.id)),
    bytesBefore: input.length,
    bytesAfter: res.output.length,
    imageDataIdentical: true,
    warnings: res.warnings,
    edited: res.edited,
  };
}
