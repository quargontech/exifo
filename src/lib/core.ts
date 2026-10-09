/**
 * Public API of the zero-dependency parser package (packages/exifo-core).
 * Runs in browsers, Web Workers and Node 20+.
 */

export * from "./types";
export { detectFormat, detectAnyFormat, type AnyImageFormat } from "./detect";
export { scan, stripContainer, imageDataRanges, requireFormat } from "./container";
export { strip, DEFAULT_STRIP_OPTIONS } from "./strip";
export { verifyImageData, imageDataHash, sha256 } from "./verify";
export { parseJpeg, scanJpeg, stripJpeg, jpegImageRanges, type JpegParse, type JpegSeg } from "./jpeg";
export { parsePng, scanPng, stripPng, pngImageRanges, type PngParse, type PngChunk } from "./png";
export { parseWebp, scanWebp, stripWebp, webpImageRanges, type WebpParse, type RiffChunk } from "./webp";
export { minimalOrientationApp1, minimalOrientationTiff, readOrientation, needsOrientation } from "./exif-min";
export { editExif } from "./exif-edit";
export { parseTiff, type TiffInfo, type TiffIfd, type TiffEntry } from "./tiff";
export { composeOrientation, setJpegOrientation } from "./orientation";
export { buildXmpPacket, type DescriptiveFields } from "./xmp-write";
export { crc32 } from "./crc32";
