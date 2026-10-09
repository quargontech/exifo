"use client";

import { useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import * as Comlink from "comlink";
import { OUT_LABEL, OUT_MIME, type EncodeSettings, type OutFormat } from "@/lib/codecs";
import { cn } from "@/lib/cn";
import { downloadUrl } from "@/lib/download";
import { formatBytes, formatDims } from "@/lib/format";
import type { Transform } from "@/lib/image-ops";
import { stripWorker } from "@/lib/workers";
import { ImageList } from "@/components/images/ImageList";
import { BatchBar, ImageToolFrame } from "@/components/images/ImageToolFrame";
import { outName, runBatch, runJob, usePreview, useResultsHousekeeping, type BuildRequest } from "@/components/images/jobs";
import { DownloadIcon, FlipHIcon, FlipVIcon, RotateCcwIcon, RotateCwIcon } from "@/components/icons";
import { SignalBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, inputClass, Segmented, selectClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { PreviewPlaceholder } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { createResults } from "@/store/results";
import { useImages, type ImageEntry } from "@/store/images";

type SizeMode = "none" | "pixels" | "percent" | "longest";
type Rot = 0 | 90 | 180 | 270;

const PRESETS = [
  { id: "square", label: "Square", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait", w: 1080, h: 1350 },
  { id: "story", label: "Story", w: 1080, h: 1920 },
  { id: "thumb", label: "Video thumbnail", w: 1280, h: 720 },
  { id: "passport", label: "Passport 35 × 45 mm", w: 413, h: 531 },
] as const;

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const ratio = (w: number, h: number) => {
  const g = gcd(w, h) || 1;
  return `${w / g}:${h / g}`;
};

/** A drawn crop counts once it has an area (the drag starts at zero size). */
const validCrop = (pc?: PercentCrop): pc is PercentCrop => !!pc && pc.width > 0.2 && pc.height > 0.2;

const useResizeResults = createResults<{ width: number; height: number; bytes: number; lossless: boolean }>();

function centerAspect(w: number, h: number, aspect: number) {
  let cw = w;
  let ch = Math.round(w / aspect);
  if (ch > h) {
    ch = h;
    cw = Math.round(h * aspect);
  }
  return { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), width: cw, height: ch };
}

export function ResizeTool() {
  const files = useImages((s) => s.files);
  const selected = useImages((s) => s.files.find((f) => f.id === s.selectedId) ?? s.files[0]);
  const results = useResizeResults((s) => s.results);

  const [mode, setMode] = useState<SizeMode>("longest");
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [lock, setLock] = useState(true);
  const [percent, setPercent] = useState(50);
  const [longest, setLongest] = useState(2048);
  const [preset, setPreset] = useState<string | null>(null);
  const [crops, setCrops] = useState<Record<string, PercentCrop | undefined>>({});
  const lastCrop = useRef<PercentCrop | undefined>(undefined);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [rotate, setRotate] = useState<Rot>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [format, setFormat] = useState<"auto" | OutFormat>("auto");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);

  const p = PRESETS.find((x) => x.id === preset);
  const swap = rotate % 180 !== 0;
  const cropAspect = p ? (swap ? p.h / p.w : p.w / p.h) : aspect;

  const plan = (f: ImageEntry): { transform: Transform; out: { width: number; height: number } } => {
    const pc = crops[f.id];
    let crop: Transform["crop"];
    if (validCrop(pc))
      crop = { x: (pc.x / 100) * f.width, y: (pc.y / 100) * f.height, width: (pc.width / 100) * f.width, height: (pc.height / 100) * f.height };
    else if (cropAspect) crop = centerAspect(f.width, f.height, cropAspect);
    const cw0 = crop?.width ?? f.width;
    const ch0 = crop?.height ?? f.height;
    const cw = swap ? ch0 : cw0;
    const ch = swap ? cw0 : ch0;
    let size: { width: number; height: number } | undefined;
    if (p) size = { width: p.w, height: p.h };
    else if (mode === "pixels") {
      if (lock) {
        const s = Math.min(w / cw, h / ch);
        size = { width: Math.max(1, Math.round(cw * s)), height: Math.max(1, Math.round(ch * s)) };
      } else size = { width: w, height: h };
    } else if (mode === "percent") size = { width: Math.max(1, Math.round((cw * percent) / 100)), height: Math.max(1, Math.round((ch * percent) / 100)) };
    else if (mode === "longest") {
      const s = longest / Math.max(cw, ch);
      size = { width: Math.max(1, Math.round(cw * s)), height: Math.max(1, Math.round(ch * s)) };
    }
    return { transform: { crop, rotate, flipH, flipV, resize: size }, out: size ?? { width: Math.round(cw), height: Math.round(ch) } };
  };

  const geometryOnly = (f: ImageEntry) => !validCrop(crops[f.id]) && !p && mode === "none" && !cropAspect;
  const losslessJpeg = (f: ImageEntry) => f.format === "jpeg" && format === "auto" && geometryOnly(f) && (rotate !== 0 || flipH || flipV);
  const encodeFor = (f: ImageEntry): EncodeSettings => {
    const fmt: OutFormat =
      format === "auto" ? (f.format === "png" || f.format === "webp" || f.format === "avif" ? f.format : f.hasAlpha ? "png" : "jpeg") : format;
    const rotateOnly = geometryOnly(f);
    return { format: fmt, quality, lossless: (fmt === "webp" || fmt === "avif") && rotateOnly, optimizePng: fmt === "png" };
  };

  const key = JSON.stringify({ mode, w, h, lock, percent, longest, preset, crops, aspect, rotate, flipH, flipV, format, quality });
  useResultsHousekeeping(useResizeResults, key);

  const build: BuildRequest = (src, f) => {
    const { transform } = plan(f);
    const enc = encodeFor(f);
    return { ...src, transform, encode: enc, background: enc.format === "jpeg" ? "#ffffff" : undefined };
  };
  const buildPreview: BuildRequest = (src, f) => {
    const { transform, out } = plan(f);
    const s = Math.min(1, 720 / Math.max(out.width, out.height));
    return {
      ...src,
      transform: { ...transform, resize: { width: Math.max(1, Math.round(out.width * s)), height: Math.max(1, Math.round(out.height * s)) } },
      encode: { format: "jpeg", quality: 85 },
      background: "#ffffff",
    };
  };
  const preview = usePreview(selected, key, buildPreview, "jpeg", !!selected);

  const run = async () => {
    setBusy(true);
    try {
      await runBatch(useResizeResults, files, key, async (f) => {
        if (losslessJpeg(f)) {
          const buf = await f.file.arrayBuffer();
          const r = await stripWorker().call((api) => api.reorient(Comlink.transfer(buf, [buf]), rotate, flipH, flipV));
          const sz = plan(f).out;
          return {
            blob: new Blob([r.output], { type: "image/jpeg" }),
            name: outName(f.name, "jpeg", "-rotated"),
            info: { ...sz, bytes: r.output.byteLength, lossless: true },
          };
        }
        const r = await runJob(f, build);
        const fmt = encodeFor(f).format;
        return {
          blob: new Blob([r.output], { type: OUT_MIME[fmt] }),
          name: outName(f.name, fmt, "-resized"),
          info: { width: r.width, height: r.height, bytes: r.bytes, lossless: false },
        };
      });
    } finally {
      setBusy(false);
    }
  };

  const sel = selected ? plan(selected) : null;
  const done = files.filter((f) => results[f.id]?.status === "done").length;
  const allLossless = files.length > 0 && files.every(losslessJpeg);
  const onLockedW = (v: number) => {
    setW(v);
    if (lock && sel) setH(Math.max(1, Math.round((v * sel.out.height) / Math.max(1, sel.out.width))));
  };
  const onLockedH = (v: number) => {
    setH(v);
    if (lock && sel) setW(Math.max(1, Math.round((v * sel.out.width) / Math.max(1, sel.out.height))));
  };
  const crop = selected ? crops[selected.id] : undefined;
  // Without a drawn crop, show the centre crop that a preset or aspect ratio will use.
  const implied: PercentCrop | undefined =
    selected && cropAspect && selected.width && selected.height
      ? (() => {
          const c = centerAspect(selected.width, selected.height, cropAspect);
          return {
            unit: "%",
            x: (c.x / selected.width) * 100,
            y: (c.y / selected.height) * 100,
            width: (c.width / selected.width) * 100,
            height: (c.height / selected.height) * 100,
          };
        })()
      : undefined;

  return (
    <ImageToolFrame tool="resize" emptyTitle="Drop images to resize or crop">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <section aria-label="Crop" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Crop {files.length > 1 && <span className="font-normal text-ink-3">· {selected?.name}</span>}</h2>
            {validCrop(crop) && (
              <Button variant="ghost" size="sm" onClick={() => selected && setCrops((c) => ({ ...c, [selected.id]: undefined }))}>
                Reset crop
              </Button>
            )}
          </div>
          {selected?.url ? (
            <div className={cn("flex justify-center rounded-xl bg-surface-2 p-2", results[selected.id]?.status === "working" && "exifo-scan exifo-scan-proof")}>
              <ReactCrop
                crop={crop ?? implied}
                aspect={cropAspect}
                keepSelection={false}
                ruleOfThirds
                minWidth={8}
                minHeight={8}
                onChange={(_, pc) => {
                  lastCrop.current = pc;
                  if (selected) setCrops((c) => ({ ...c, [selected.id]: pc }));
                }}
                // Not onComplete: the library also calls it when a new drag starts at zero size.
                onDragEnd={() => {
                  if (selected && !validCrop(lastCrop.current)) setCrops((c) => ({ ...c, [selected.id]: undefined }));
                }}
              >
                <img src={selected.url} alt={`Crop ${selected.name}`} className="max-h-[480px] w-auto max-w-full" />
              </ReactCrop>
            </div>
          ) : (
            <PreviewPlaceholder decoding={selected?.status === "decoding"} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-semibold text-ink-2">Aspect</span>
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={!!p}
                aria-pressed={!p && aspect === a.value}
                onClick={() => {
                  setAspect(a.value);
                  setCrops({});
                }}
                className={cn(
                  "h-9 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-40",
                  !p && aspect === a.value ? "border-ink text-ink" : "border-line-strong text-ink-2",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          {selected && validCrop(crop) ? (
            <p className="m-0 font-mono text-[13px] text-ink-2">
              Crop {Math.round((crop.width / 100) * selected.width)} × {Math.round((crop.height / 100) * selected.height)} px at{" "}
              {Math.round((crop.x / 100) * selected.width)}, {Math.round((crop.y / 100) * selected.height)}
            </p>
          ) : (
            <p className="m-0 text-[13px] text-ink-3">
              Drag on the image to crop. Without a crop, {cropAspect ? "the centre is cropped to the aspect ratio" : "the whole image is used"}.
            </p>
          )}
          {preview.url && sel && (
            <div className="flex items-center gap-3 border-t border-line pt-3">
              <img src={preview.url} alt="Result preview" className="h-20 w-auto max-w-[160px] rounded-md border border-line object-contain" />
              <div className="text-[13px]">
                <div className="font-semibold">Result</div>
                <div className="font-mono text-ink-2">{formatDims(sel.out.width, sel.out.height)}</div>
              </div>
            </div>
          )}
        </section>

        <section aria-label="Settings" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-[15px] font-semibold">Size</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={preset === x.id}
                  onClick={() => {
                    setPreset(preset === x.id ? null : x.id);
                    setCrops({});
                  }}
                  className={cn(
                    "flex h-auto min-h-10 flex-col items-start rounded-xl border px-3 py-1.5 text-left",
                    preset === x.id ? "border-[1.5px] border-ink" : "border-line-strong",
                  )}
                >
                  <span className="text-[13px] font-semibold">{x.label}</span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {x.w} × {x.h}
                  </span>
                </button>
              ))}
            </div>
            {!p && (
              <>
                <Segmented
                  label="Resize by"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "none", label: "Keep" },
                    { value: "pixels", label: "Pixels" },
                    { value: "percent", label: "%" },
                    { value: "longest", label: "Longest side" },
                  ]}
                />
                {mode === "pixels" && (
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Width" htmlFor="rs-w">
                      <input
                        id="rs-w"
                        type="number"
                        min={1}
                        className={`${inputClass} w-28`}
                        value={w}
                        onChange={(e) => onLockedW(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </Field>
                    <span className="pb-3 text-ink-3">×</span>
                    <Field label="Height" htmlFor="rs-h">
                      <input
                        id="rs-h"
                        type="number"
                        min={1}
                        className={`${inputClass} w-28`}
                        value={h}
                        onChange={(e) => onLockedH(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </Field>
                    <Switch checked={lock} onChange={setLock} label="Keep aspect" className="pb-2.5" />
                  </div>
                )}
                {mode === "percent" && <Slider label="Scale" value={percent} onChange={setPercent} min={5} max={200} format={(v) => `${v}%`} />}
                {mode === "longest" && (
                  <Field label="Longest side" htmlFor="rs-l" hint="Width or height, whichever is larger.">
                    <div className="flex items-center gap-2">
                      <input
                        id="rs-l"
                        type="number"
                        min={1}
                        className={`${inputClass} w-32`}
                        value={longest}
                        onChange={(e) => setLongest(Math.max(1, Number(e.target.value) || 1))}
                      />
                      <span className="text-sm text-ink-2">px</span>
                    </div>
                  </Field>
                )}
              </>
            )}
            {p && (
              <p className="m-0 text-[13px] text-ink-3">
                The image is cropped to {ratio(p.w, p.h)} and resized to {p.w} × {p.h} with Lanczos resampling.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-[15px] font-semibold">Rotate and flip</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="icon" aria-label="Rotate left" onClick={() => setRotate(((rotate + 270) % 360) as Rot)}>
                <RotateCcwIcon />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Rotate right" onClick={() => setRotate(((rotate + 90) % 360) as Rot)}>
                <RotateCwIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-pressed={flipH}
                aria-label="Flip horizontally"
                className={cn(flipH && "border-ink")}
                onClick={() => setFlipH(!flipH)}
              >
                <FlipHIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-pressed={flipV}
                aria-label="Flip vertically"
                className={cn(flipV && "border-ink")}
                onClick={() => setFlipV(!flipV)}
              >
                <FlipVIcon />
              </Button>
              <span className="self-center font-mono text-[13px] text-ink-2">
                {rotate}°{flipH ? " · flipped H" : ""}
                {flipV ? " · flipped V" : ""}
              </span>
            </div>
            {allLossless && (
              <SignalBadge tone="proof" icon="tick" className="self-start">
                Lossless rotate: only the JPEG orientation tag changes
              </SignalBadge>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-[15px] font-semibold">Output</h2>
            <select aria-label="Output format" className={selectClass} value={format} onChange={(e) => setFormat(e.target.value as "auto" | OutFormat)}>
              <option value="auto">Same as original</option>
              {(["jpeg", "png", "webp", "avif"] as OutFormat[]).map((f) => (
                <option key={f} value={f}>
                  {OUT_LABEL[f]}
                </option>
              ))}
            </select>
            {!allLossless && <Slider label="Quality" value={quality} onChange={setQuality} min={40} max={100} />}
          </div>
          <Notice tone="quiet">Resizing re-encodes the image and removes metadata. Rotating a JPEG without cropping or resizing is lossless.</Notice>
        </section>
      </div>

      <ImageList
        busy={(f) => results[f.id]?.status === "working"}
        right={(f) => {
          const r = results[f.id];
          if (r?.status === "working") return <StatusBadge status="processing" label="Working" />;
          if (r?.status === "error") return <span className="max-w-[260px] text-[13px] text-danger">{r.error}</span>;
          if (r?.status === "done" && r.info)
            return (
              <>
                <span className="font-mono text-[13px]">
                  {formatDims(r.info.width, r.info.height)} · {formatBytes(r.info.bytes)}
                </span>
                {r.info.lossless && (
                  <SignalBadge tone="proof" icon="tick" size="sm">
                    Lossless
                  </SignalBadge>
                )}
                <Button variant="secondary" onClick={() => downloadUrl(r.url!, r.name!)}>
                  <DownloadIcon size={18} />
                  Download
                </Button>
              </>
            );
          return <span className="font-mono text-[13px] text-ink-3">→ {formatDims(plan(f).out.width, plan(f).out.height)}</span>;
        }}
      />
      <BatchBar
        total={files.length}
        done={done}
        busy={busy}
        onRun={run}
        runLabel={allLossless ? "Rotate all" : "Resize all"}
        onZip={() =>
          useResizeResults.getState().zip(
            files.map((f) => f.id),
            "exifo-resized.zip",
          )
        }
      />
    </ImageToolFrame>
  );
}
