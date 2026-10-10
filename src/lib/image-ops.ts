/**
 * Re-encoding pipeline for the image tools (Compress, Convert, Resize, Watermark).
 * decode → crop / rotate / flip → resize → watermark → encode.
 * Metadata is not carried over; EXIF orientation is applied to the pixels.
 */

import { toArrayBuffer } from "./bytes";
import { decodeToBitmap, encodeImage, isLossy, resizeImageData, type EncodeSettings } from "./codecs";
import { stripContainer } from "./container";
import { buildCreditXmp } from "./xmp-write";

export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export interface WatermarkSpec {
  kind: "text" | "logo";
  text?: string;
  color?: string;
  /** Font weight 400–800. */
  weight?: number;
  logo?: ArrayBuffer;
  logoMime?: string;
  position: Anchor;
  tiled: boolean;
  /** 0–1 */
  opacity: number;
  /** Size as a percentage of the image width (logo width or text line height × 4). */
  size: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** Percentage of the shorter side. */
  margin: number;
}

export interface Transform {
  /** Crop rectangle in the upright (orientation-applied) source pixels. */
  crop?: { x: number; y: number; width: number; height: number };
  rotate?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  /** Final output size. */
  resize?: { width: number; height: number };
}

export interface ProcessRequest {
  buffer: ArrayBuffer;
  mime: string;
  transform?: Transform;
  watermark?: WatermarkSpec;
  encode: EncodeSettings;
  /** Flatten transparency onto this colour (used for JPEG output). */
  background?: string;
  /** Aim for at most this many bytes. */
  targetBytes?: number;
  /** Write a small "Software: Exifo" XMP credit into the output (JPEG, PNG and WebP only). */
  credit?: boolean;
}

export interface ProcessResult {
  output: ArrayBuffer;
  width: number;
  height: number;
  quality: number;
  bytes: number;
  /** Set when the target size needed smaller dimensions. */
  scaledTo?: { width: number; height: number };
  reachedTarget?: boolean;
}

function anchorXY(a: Anchor, W: number, H: number, w: number, h: number, m: number): [number, number] {
  const col = a[1] === "l" ? 0 : a[1] === "c" ? 1 : 2;
  const row = a[0] === "t" ? 0 : a[0] === "m" ? 1 : 2;
  const x = col === 0 ? m : col === 1 ? (W - w) / 2 : W - w - m;
  const y = row === 0 ? m : row === 1 ? (H - h) / 2 : H - h - m;
  return [x, y];
}

export async function drawWatermark(ctx: OffscreenCanvasRenderingContext2D, W: number, H: number, wm: WatermarkSpec) {
  const margin = (Math.min(W, H) * wm.margin) / 100;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, wm.opacity));
  let draw: (x: number, y: number) => void;
  let w = 0;
  let h = 0;
  if (wm.kind === "logo" && wm.logo) {
    const bmp = await createImageBitmap(new Blob([wm.logo], { type: wm.logoMime || "image/png" }));
    w = Math.max(1, (W * wm.size) / 100);
    h = (w * bmp.height) / bmp.width;
    draw = (x, y) => ctx.drawImage(bmp, x, y, w, h);
  } else {
    const text = (wm.text || "").trim() || " ";
    const px = Math.max(8, (W * wm.size) / 100 / 4);
    ctx.font = `${wm.weight ?? 600} ${px}px "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = wm.color || "#ffffff";
    w = ctx.measureText(text).width;
    h = px * 1.2;
    // Soft shadow keeps light text readable on light photos.
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = px * 0.08;
    draw = (x, y) => ctx.fillText(text, x, y + px * 0.1);
  }
  const rad = (wm.rotation * Math.PI) / 180;
  if (wm.tiled) {
    const stepX = w + Math.max(w * 0.6, margin * 2, 24);
    const stepY = h + Math.max(h * 2.2, margin * 2, 24);
    const diag = Math.hypot(W, H);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rad);
    let row = 0;
    for (let y = -diag / 2; y < diag / 2; y += stepY, row++) {
      const offset = row % 2 ? stepX / 2 : 0;
      for (let x = -diag / 2 - offset; x < diag / 2; x += stepX) draw(x, y);
    }
  } else {
    const [x, y] = anchorXY(wm.position, W, H, w, h, margin);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rad);
    draw(-w / 2, -h / 2);
  }
  ctx.restore();
}

/** Decode and apply crop / rotate / flip / resize / watermark. Returns upright RGBA pixels. */
export async function renderPixels(req: Omit<ProcessRequest, "encode" | "targetBytes">): Promise<ImageData> {
  const bmp = await decodeToBitmap(new Blob([req.buffer], { type: req.mime }));
  try {
    const t = req.transform ?? {};
    const crop = t.crop
      ? {
          x: Math.max(0, Math.round(t.crop.x)),
          y: Math.max(0, Math.round(t.crop.y)),
          width: Math.max(1, Math.min(bmp.width, Math.round(t.crop.width))),
          height: Math.max(1, Math.min(bmp.height, Math.round(t.crop.height))),
        }
      : { x: 0, y: 0, width: bmp.width, height: bmp.height };
    const rot = t.rotate ?? 0;
    const swap = rot === 90 || rot === 270;
    const cw = swap ? crop.height : crop.width;
    const ch = swap ? crop.width : crop.height;
    const canvas = new OffscreenCanvas(cw, ch);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not available");
    if (req.background) {
      ctx.fillStyle = req.background;
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1);
    ctx.drawImage(bmp, crop.x, crop.y, crop.width, crop.height, -crop.width / 2, -crop.height / 2, crop.width, crop.height);
    ctx.restore();
    let img = ctx.getImageData(0, 0, cw, ch);
    if (t.resize && (t.resize.width !== cw || t.resize.height !== ch)) {
      img = await resizeImageData(img, Math.max(1, Math.round(t.resize.width)), Math.max(1, Math.round(t.resize.height)));
    }
    if (req.watermark) {
      const out = new OffscreenCanvas(img.width, img.height);
      const octx = out.getContext("2d", { willReadFrequently: true })!;
      octx.putImageData(img, 0, 0);
      await drawWatermark(octx, img.width, img.height, req.watermark);
      img = octx.getImageData(0, 0, img.width, img.height);
    }
    return img;
  } finally {
    bmp.close();
  }
}

async function encodeToTarget(img: ImageData, s: EncodeSettings, target: number) {
  const tries: { q: number; buf: ArrayBuffer }[] = [];
  const at = async (q: number) => {
    const hit = tries.find((t) => t.q === q);
    if (hit) return hit.buf;
    const buf = await encodeImage(img, { ...s, quality: q });
    tries.push({ q, buf });
    return buf;
  };
  if (!isLossy(s)) {
    const buf = await encodeImage(img, s);
    return { buf, q: s.quality, ok: buf.byteLength <= target };
  }
  let hi = Math.min(95, Math.max(10, s.quality));
  const top = await at(hi);
  if (top.byteLength <= target) return { buf: top, q: hi, ok: true };
  let lo = 5;
  let best: { buf: ArrayBuffer; q: number } | null = null;
  for (let i = 0; i < 7 && lo <= hi; i++) {
    const mid = Math.round((lo + hi) / 2);
    const buf = await at(mid);
    if (buf.byteLength <= target) {
      best = { buf, q: mid };
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (best) return { ...best, ok: true };
  return { buf: await at(5), q: 5, ok: false };
}

// XMP injection only exists for these containers; AVIF output carries no credit.
const CREDITABLE = new Set(["jpeg", "png", "webp"]);

/** Add the Exifo credit to the encoded bytes if asked. Never fails a job: on any error the output is returned as-is. */
function withCredit(req: ProcessRequest, res: ProcessResult): ProcessResult {
  if (!req.credit || !CREDITABLE.has(req.encode.format)) return res;
  try {
    const out = stripContainer(new Uint8Array(res.output), { remove: [], keepOrientation: true, xmp: buildCreditXmp() });
    const output = toArrayBuffer(out.output);
    return { ...res, output, bytes: output.byteLength };
  } catch {
    return res;
  }
}

export async function processImage(req: ProcessRequest): Promise<ProcessResult> {
  let img = await renderPixels(req);
  if (!req.targetBytes) {
    const output = await encodeImage(img, req.encode);
    return withCredit(req, { output, width: img.width, height: img.height, quality: req.encode.quality, bytes: output.byteLength });
  }
  const target = req.targetBytes;
  let res = await encodeToTarget(img, req.encode, target);
  let scaledTo: ProcessResult["scaledTo"];
  // Quality alone could not reach the target: reduce dimensions and try again.
  for (let round = 0; !res.ok && round < 5 && img.width > 16 && img.height > 16; round++) {
    const factor = Math.max(0.3, Math.min(0.92, Math.sqrt(target / res.buf.byteLength) * 0.95));
    const w = Math.max(16, Math.round(img.width * factor));
    const h = Math.max(16, Math.round(img.height * factor));
    img = await resizeImageData(img, w, h);
    scaledTo = { width: w, height: h };
    res = await encodeToTarget(img, req.encode, target);
  }
  return withCredit(req, { output: res.buf, width: img.width, height: img.height, quality: res.q, bytes: res.buf.byteLength, scaledTo, reachedTarget: res.ok });
}
