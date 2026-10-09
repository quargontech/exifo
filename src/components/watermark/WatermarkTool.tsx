"use client";

import { useRef, useState } from "react";
import { autoFormat, OUT_LABEL, OUT_MIME, type OutFormat } from "@/lib/codecs";
import { cn } from "@/lib/cn";
import { downloadUrl } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import type { Anchor, WatermarkSpec } from "@/lib/image-ops";
import { ImageList } from "@/components/images/ImageList";
import { BatchBar, ImageToolFrame } from "@/components/images/ImageToolFrame";
import { outName, runBatch, runJob, usePreview, useResultsHousekeeping, type BuildRequest } from "@/components/images/jobs";
import { DownloadIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, inputClass, Segmented, selectClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { createResults } from "@/store/results";
import { useImages, type ImageEntry } from "@/store/images";

const useWatermarkResults = createResults<{ bytes: number }>();

const GRID: { id: Anchor; label: string }[] = [
  { id: "tl", label: "Top left" },
  { id: "tc", label: "Top centre" },
  { id: "tr", label: "Top right" },
  { id: "ml", label: "Middle left" },
  { id: "mc", label: "Centre" },
  { id: "mr", label: "Middle right" },
  { id: "bl", label: "Bottom left" },
  { id: "bc", label: "Bottom centre" },
  { id: "br", label: "Bottom right" },
];

export function WatermarkTool() {
  const files = useImages((s) => s.files);
  const selected = useImages((s) => s.files.find((f) => f.id === s.selectedId) ?? s.files[0]);
  const results = useWatermarkResults((s) => s.results);
  const [kind, setKind] = useState<"text" | "logo">("text");
  const [text, setText] = useState("© Your Name");
  const [color, setColor] = useState("#ffffff");
  const [logo, setLogo] = useState<{ buf: ArrayBuffer; mime: string; name: string; url: string } | null>(null);
  const [position, setPosition] = useState<Anchor>("br");
  const [tiled, setTiled] = useState(false);
  const [opacity, setOpacity] = useState(70);
  const [size, setSize] = useState(30);
  const [rotation, setRotation] = useState(0);
  const [margin, setMargin] = useState(4);
  const [format, setFormat] = useState<"auto" | OutFormat>("auto");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const spec = (): WatermarkSpec => ({
    kind,
    text,
    color,
    weight: 700,
    logo: kind === "logo" ? logo?.buf : undefined,
    logoMime: logo?.mime,
    position,
    tiled,
    opacity: opacity / 100,
    size,
    rotation,
    margin,
  });
  const fmtFor = (f: ImageEntry): OutFormat => (format === "auto" ? autoFormat(f.format, f.hasAlpha) : format);
  const ready = kind === "text" ? text.trim().length > 0 : !!logo;
  const key = JSON.stringify({ kind, text, color, logo: logo?.name, position, tiled, opacity, size, rotation, margin, format, quality });
  useResultsHousekeeping(useWatermarkResults, key);

  const build: BuildRequest = (src, f) => {
    const fmt = fmtFor(f);
    return { ...src, watermark: spec(), encode: { format: fmt, quality, optimizePng: fmt === "png" }, background: fmt === "jpeg" ? "#ffffff" : undefined };
  };
  const buildPreview: BuildRequest = (src, f) => {
    const s = Math.min(1, 900 / Math.max(f.width, f.height));
    return {
      ...src,
      watermark: spec(),
      transform: { resize: { width: Math.max(1, Math.round(f.width * s)), height: Math.max(1, Math.round(f.height * s)) } },
      encode: { format: "jpeg", quality: 88 },
      background: "#ffffff",
    };
  };
  const preview = usePreview(selected, key, buildPreview, "jpeg", !!selected && ready);

  const run = async () => {
    setBusy(true);
    try {
      await runBatch(useWatermarkResults, files, key, async (f) => {
        const r = await runJob(f, build);
        const fmt = fmtFor(f);
        return { blob: new Blob([r.output], { type: OUT_MIME[fmt] }), name: outName(f.name, fmt, "-watermarked"), info: { bytes: r.bytes } };
      });
    } finally {
      setBusy(false);
    }
  };
  const done = files.filter((f) => results[f.id]?.status === "done").length;

  return (
    <ImageToolFrame tool="watermark" emptyTitle="Drop images to watermark">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <section aria-label="Preview" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div
            className={cn(
              "relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl",
              selected?.status === "decoding" ? "exifo-shimmer" : "bg-surface-2",
              (preview.status === "working" || (selected && results[selected.id]?.status === "working")) && "exifo-scan exifo-scan-proof",
            )}
          >
            {preview.url && ready ? (
              <img src={preview.url} alt="Watermark preview" className="max-h-[520px] w-auto max-w-full" />
            ) : selected?.url ? (
              <img src={selected.url} alt="" className="max-h-[520px] w-auto max-w-full opacity-60" />
            ) : null}
            {preview.status === "working" && (
              <span className="exifo-enter absolute bottom-2.5 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                <Spinner size={13} />
                Rendering…
              </span>
            )}
          </div>
          {preview.status === "error" && <Notice tone="error">{preview.error}</Notice>}
        </section>

        <section aria-label="Settings" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <Segmented
            label="Watermark type"
            stretch
            value={kind}
            onChange={setKind}
            options={[
              { value: "text", label: "Text" },
              { value: "logo", label: "Logo" },
            ]}
          />
          {kind === "text" ? (
            <div className="flex items-end gap-3">
              <Field label="Text" htmlFor="wm-text" className="flex-1">
                <input id="wm-text" className={inputClass} value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
              </Field>
              <Field label="Colour" htmlFor="wm-color">
                <input
                  id="wm-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-[10px] border border-line-strong bg-surface p-1"
                />
              </Field>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (logo) URL.revokeObjectURL(logo.url);
                  setLogo({ buf: await file.arrayBuffer(), mime: file.type || "image/png", name: file.name, url: URL.createObjectURL(file) });
                }}
              />
              {logo && (
                <img
                  src={logo.url}
                  alt="Logo"
                  className="h-12 w-12 rounded-lg border border-line bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:10px_10px] object-contain"
                />
              )}
              <Button variant="secondary" onClick={() => logoInput.current?.click()}>
                {logo ? "Change logo" : "Choose a logo (PNG)"}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-start gap-5">
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" disabled={tiled}>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Position</legend>
              <div className={cn("grid grid-cols-3 gap-1.5", tiled && "opacity-40")}>
                {GRID.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-label={g.label}
                    aria-pressed={position === g.id}
                    onClick={() => setPosition(g.id)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg border",
                      position === g.id ? "border-ink bg-primary" : "border-line-strong bg-surface hover:bg-surface-2 dark:bg-transparent",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", position === g.id ? "bg-primary-fg" : "bg-line-strong")} />
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex min-w-[180px] flex-1 flex-col gap-3 pt-6">
              <Switch checked={tiled} onChange={setTiled} label="Tile across the image" />
            </div>
          </div>
          <Slider label="Opacity" value={opacity} onChange={setOpacity} min={5} max={100} format={(v) => `${v}%`} />
          <Slider label="Size" value={size} onChange={setSize} min={5} max={100} format={(v) => `${v}%`} />
          <Slider label="Rotation" value={rotation} onChange={setRotation} min={-90} max={90} format={(v) => `${v}°`} />
          {!tiled && <Slider label="Margin" value={margin} onChange={setMargin} min={0} max={20} format={(v) => `${v}%`} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="Output format" className={selectClass} value={format} onChange={(e) => setFormat(e.target.value as "auto" | OutFormat)}>
              <option value="auto">Same as original</option>
              {(["jpeg", "png", "webp", "avif"] as OutFormat[]).map((f) => (
                <option key={f} value={f}>
                  {OUT_LABEL[f]}
                </option>
              ))}
            </select>
            <Slider label="Quality" value={quality} onChange={setQuality} min={40} max={100} />
          </div>
          <Notice tone="quiet">Visible watermarks only. The image is re-encoded and its metadata removed.</Notice>
        </section>
      </div>

      <ImageList
        busy={(f) => results[f.id]?.status === "working"}
        right={(f) => {
          const r = results[f.id];
          if (r?.status === "working") return <StatusBadge status="processing" label="Working" />;
          if (r?.status === "error") return <span className="max-w-[260px] text-[13px] text-danger">{r.error}</span>;
          if (r?.status === "done")
            return (
              <>
                <span className="font-mono text-[13px]">{formatBytes(r.info?.bytes ?? 0)}</span>
                <Button variant="secondary" onClick={() => downloadUrl(r.url!, r.name!)}>
                  <DownloadIcon size={18} />
                  Download
                </Button>
              </>
            );
          return null;
        }}
      />
      <BatchBar
        total={files.length}
        done={done}
        busy={busy}
        runDisabled={!ready}
        onRun={run}
        runLabel="Watermark all"
        onZip={() =>
          useWatermarkResults.getState().zip(
            files.map((f) => f.id),
            "exifo-watermarked.zip",
          )
        }
      />
    </ImageToolFrame>
  );
}
