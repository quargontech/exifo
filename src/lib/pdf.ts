/**
 * Build a PDF from images with pdf-lib. JPEGs are embedded as they are (no re-encoding);
 * PNGs are embedded losslessly. EXIF orientation is honoured by rotating the image on
 * the page, because PDF viewers ignore the tag.
 */

export type PageSize = "a4" | "letter" | "fit";
export type PageOrientation = "auto" | "portrait" | "landscape";

export interface PdfOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  /** Margin in millimetres. */
  margin: number;
  title?: string;
}

export interface PdfImage {
  kind: "jpeg" | "png";
  bytes: Uint8Array;
  /** Stored pixel size (before rotation). */
  width: number;
  height: number;
  /** Clockwise rotation needed to display it upright. */
  rotation: 0 | 90 | 180 | 270;
}

const MM = 72 / 25.4;
const SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
/** "Fit to image" pages use 96 px per inch. */
const PX = 72 / 96;

/** Clockwise rotation for EXIF orientations without mirroring (1, 3, 6, 8). */
export function rotationFor(orientation: number): PdfImage["rotation"] | null {
  return orientation === 1 ? 0 : orientation === 3 ? 180 : orientation === 6 ? 90 : orientation === 8 ? 270 : null;
}

export async function buildPdf(images: PdfImage[], opts: PdfOptions): Promise<Uint8Array> {
  const { degrees, PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setProducer("Exifo");
  doc.setCreator("Exifo (exifo.app)");
  if (opts.title) doc.setTitle(opts.title);
  const margin = Math.max(0, opts.margin) * MM;

  for (const im of images) {
    const embedded = im.kind === "jpeg" ? await doc.embedJpg(im.bytes) : await doc.embedPng(im.bytes);
    const swap = im.rotation === 90 || im.rotation === 270;
    const dispW = swap ? im.height : im.width;
    const dispH = swap ? im.width : im.height;

    let pageW: number;
    let pageH: number;
    if (opts.pageSize === "fit") {
      pageW = dispW * PX + margin * 2;
      pageH = dispH * PX + margin * 2;
    } else {
      const [a, b] = SIZES[opts.pageSize];
      const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && dispW > dispH);
      [pageW, pageH] = landscape ? [b, a] : [a, b];
    }
    const page = doc.addPage([pageW, pageH]);
    const boxW = Math.max(1, pageW - margin * 2);
    const boxH = Math.max(1, pageH - margin * 2);
    const scale = Math.min(boxW / dispW, boxH / dispH);
    const dw = dispW * scale;
    const dh = dispH * scale;
    const bx = (pageW - dw) / 2;
    const by = (pageH - dh) / 2;
    // Drawn size in stored orientation.
    const W = im.width * scale;
    const H = im.height * scale;
    if (im.rotation === 0) page.drawImage(embedded, { x: bx, y: by, width: W, height: H });
    else if (im.rotation === 90) page.drawImage(embedded, { x: bx, y: by + W, width: W, height: H, rotate: degrees(-90) });
    else if (im.rotation === 180) page.drawImage(embedded, { x: bx + W, y: by + H, width: W, height: H, rotate: degrees(180) });
    else page.drawImage(embedded, { x: bx + H, y: by, width: W, height: H, rotate: degrees(90) });
  }
  return doc.save({ useObjectStreams: true });
}
