"use client";

import { useMemo, useState } from "react";
import { autoFormat, OUT_LABEL, OUT_MIME, type EncodeSettings, type OutFormat } from "@/lib/codecs";
import { downloadUrl } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { BeforeAfter } from "@/components/images/BeforeAfter";
import { ImageList } from "@/components/images/ImageList";
import { BatchBar, ImageToolFrame } from "@/components/images/ImageToolFrame";
import { outName, runBatch, runJob, usePreview, useResultsHousekeeping, type BuildRequest } from "@/components/images/jobs";
import { DownloadIcon } from "@/components/icons";
import { SignalBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, inputClass, Segmented, selectClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { PreviewPlaceholder, Spinner } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useCreditSetting } from "@/lib/credit";
import { CreditToggle } from "@/components/images/CreditToggle";
import * as Comlink from "comlink";
import { ALL_BLOCK_KINDS } from "@/lib/types";
import { stripWorker } from "@/lib/workers";
import { buildCreditXmp } from "@/lib/xmp-write";
import { createResults } from "@/store/results";
import { useImages, type ImageEntry } from "@/store/images";

type FormatChoice = "auto" | OutFormat;
interface Info {
  bytes: number;
  quality: number;
  width: number;
  height: number;
  scaled: boolean;
  reached?: boolean;
  /** Re-encoding was not smaller, so the original image data was kept with its metadata removed. */
  original?: boolean;
}

const useCompressResults = createResults<Info>();

/** Percentage saved, without rounding a 99.8% saving up to a misleading 100%. */
const pct = (fraction: number) => {
  const p = fraction * 100;
  return p > 99 && p < 100 ? (Math.floor(p * 10) / 10).toFixed(1) : String(Math.round(p));
};

/** The original file with every metadata block removed losslessly (JPEG, PNG, WebP), plus the credit if enabled. */
async function originalWithoutMetadata(f: ImageEntry, credit: boolean): Promise<ArrayBuffer | null> {
  try {
    const buf = await f.file.arrayBuffer();
    const res = await stripWorker().call((api) =>
      api.clean(Comlink.transfer(buf, [buf]), { remove: [...ALL_BLOCK_KINDS], keepOrientation: true, xmp: credit ? buildCreditXmp() : undefined }),
    );
    return res.output;
  } catch {
    return null;
  }
}
const TARGETS = [100, 200, 500, 1000];

export function CompressTool() {
  const files = useImages((s) => s.files);
  const selected = useImages((s) => s.files.find((f) => f.id === s.selectedId) ?? s.files[0]);
  const results = useCompressResults((s) => s.results);
  const [format, setFormat] = useState<FormatChoice>("auto");
  const [mode, setMode] = useState<"quality" | "target">("quality");
  const [quality, setQuality] = useState(75);
  const [targetKB, setTargetKB] = useState(200);
  const [lossless, setLossless] = useState(false);
  const [busy, setBusy] = useState(false);
  const [credit] = useCreditSetting();

  const fmtFor = (f: ImageEntry): OutFormat => (format === "auto" ? autoFormat(f.format, f.hasAlpha) : format);
  const settings = (f: ImageEntry): EncodeSettings => {
    const fmt = fmtFor(f);
    return { format: fmt, quality, lossless: (fmt === "webp" || fmt === "avif") && lossless, optimizePng: fmt === "png" };
  };
  const key = `${format}|${mode}|${quality}|${targetKB}|${lossless}|${credit}`;
  useResultsHousekeeping(useCompressResults, key);

  const build: BuildRequest = (src, f) => ({
    ...src,
    encode: settings(f),
    background: fmtFor(f) === "jpeg" ? "#ffffff" : undefined,
    targetBytes: mode === "target" ? targetKB * 1000 : undefined,
    credit,
  });
  const preview = usePreview(selected, key, build, selected ? fmtFor(selected) : "jpeg");

  const run = async () => {
    setBusy(true);
    try {
      await runBatch(useCompressResults, files, key, async (f) => {
        const r = await runJob(f, build);
        const fmt = fmtFor(f);
        // Re-encoding did not help: hand back the original image data, still without its metadata.
        if (r.bytes >= f.size && !r.scaledTo && fmt === f.format && (fmt === "jpeg" || fmt === "png" || fmt === "webp")) {
          const kept = await originalWithoutMetadata(f, credit);
          if (kept && kept.byteLength <= r.bytes) {
            return {
              blob: new Blob([kept], { type: OUT_MIME[fmt] }),
              name: outName(f.name, fmt, "-compressed"),
              info: {
                bytes: kept.byteLength,
                quality: r.quality,
                width: f.width,
                height: f.height,
                scaled: false,
                reached: mode === "target" ? kept.byteLength <= targetKB * 1000 : undefined,
                original: true,
              },
            };
          }
        }
        return {
          blob: new Blob([r.output], { type: OUT_MIME[fmt] }),
          name: outName(f.name, fmt, "-compressed"),
          info: { bytes: r.bytes, quality: r.quality, width: r.width, height: r.height, scaled: !!r.scaledTo, reached: r.reachedTarget },
        };
      });
    } finally {
      setBusy(false);
    }
  };

  const done = files.filter((f) => results[f.id]?.status === "done").length;
  const anyLossy = useMemo(
    () =>
      files.some((f) => {
        const fmt = format === "auto" ? autoFormat(f.format, f.hasAlpha) : format;
        return fmt === "jpeg" || ((fmt === "webp" || fmt === "avif") && !lossless);
      }),
    [files, format, lossless],
  );
  const selFmt = selected ? fmtFor(selected) : "jpeg";
  const pr = preview.result;

  return (
    <ImageToolFrame tool="compress" emptyTitle="Drop images to compress">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
        <section aria-label="Preview" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          {selected?.url ? (
            <BeforeAfter
              before={selected.url}
              after={preview.url ?? null}
              ratio={selected.width / Math.max(1, selected.height)}
              afterLabel={OUT_LABEL[selFmt]}
              busy={preview.status === "working" || results[selected.id]?.status === "working"}
            />
          ) : (
            <PreviewPlaceholder decoding={selected?.status === "decoding"} />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <span className="font-mono">{selected ? formatBytes(selected.size) : ""}</span>
            <span className="text-ink-3">→</span>
            {preview.status === "working" && (
              <span className="flex items-center gap-1.5 text-ink-3">
                <Spinner size={13} className="text-proof" />
                Encoding…
              </span>
            )}
            {preview.status === "error" && <span className="text-danger">{preview.error}</span>}
            {preview.status === "done" && pr && selected && (
              <>
                <span className="font-mono font-semibold">{formatBytes(pr.bytes)}</span>
                <SignalBadge tone={pr.bytes < selected.size ? "proof" : "neutral"} size="sm">
                  {pr.bytes < selected.size ? `−${pct(1 - pr.bytes / selected.size)}%` : `+${Math.round((pr.bytes / selected.size - 1) * 100)}%`}
                </SignalBadge>
                {mode === "target" && (
                  <span className="text-ink-3">
                    quality {pr.quality}
                    {pr.scaledTo ? `, resized to ${pr.scaledTo.width} × ${pr.scaledTo.height}` : ""}
                  </span>
                )}
              </>
            )}
          </div>
        </section>

        <section aria-label="Settings" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <Field label="Format" htmlFor="cmp-format">
            <select id="cmp-format" className={selectClass} value={format} onChange={(e) => setFormat(e.target.value as FormatChoice)}>
              <option value="auto">Same as original</option>
              <option value="jpeg">JPEG (MozJPEG)</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
              <option value="png">PNG (lossless, OxiPNG)</option>
            </select>
          </Field>
          <Segmented
            label="Compression mode"
            stretch
            value={mode}
            onChange={setMode}
            options={[
              { value: "quality", label: "Quality" },
              { value: "target", label: "Target size" },
            ]}
          />
          {mode === "quality" ? (
            <Slider label="Quality" value={quality} onChange={setQuality} min={1} max={100} disabled={!anyLossy} />
          ) : (
            <div className="flex flex-col gap-2">
              <Field label="Make it under" htmlFor="cmp-target" hint="Lowers quality first, then dimensions if needed.">
                <div className="flex items-center gap-2">
                  <input
                    id="cmp-target"
                    type="number"
                    min={5}
                    step={10}
                    className={`${inputClass} w-32`}
                    value={targetKB}
                    onChange={(e) => setTargetKB(Math.max(5, Number(e.target.value) || 5))}
                  />
                  <span className="text-sm text-ink-2">KB</span>
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetKB(t)}
                    aria-pressed={targetKB === t}
                    className={`h-9 rounded-full border px-3 text-[13px] font-semibold ${targetKB === t ? "border-ink text-ink" : "border-line-strong text-ink-2"}`}
                  >
                    {t >= 1000 ? `${t / 1000} MB` : `${t} KB`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(format === "webp" || format === "avif") && <Switch checked={lossless} onChange={setLossless} label="Lossless" />}
          <CreditToggle />
          <Notice tone="quiet">
            Other metadata is removed and the orientation is applied to the pixels. Colours are converted to sRGB, so wide-gamut images lose their extra gamut.
          </Notice>
        </section>
      </div>

      <ImageList
        busy={(f) => results[f.id]?.status === "working"}
        right={(f) => {
          const r = results[f.id];
          if (r?.status === "working") return <StatusBadge status="processing" label="Compressing" />;
          if (r?.status === "error") return <span className="max-w-[260px] text-[13px] text-danger">{r.error}</span>;
          if (r?.status === "done" && r.info) {
            const saved = 1 - r.info.bytes / f.size;
            return (
              <>
                <span className="font-mono text-[13px]">
                  {formatBytes(f.size)} → <b>{formatBytes(r.info.bytes)}</b>
                </span>
                {r.info.original ? (
                  <SignalBadge tone="neutral" size="sm">
                    Already optimised
                  </SignalBadge>
                ) : (
                  <SignalBadge tone={saved > 0 ? "proof" : "neutral"} size="sm">
                    {saved > 0 ? `−${pct(saved)}%` : saved === 0 ? "Same size" : "larger"}
                  </SignalBadge>
                )}
                {r.info.scaled && (
                  <span className="text-[13px] text-ink-3">
                    resized to {r.info.width} × {r.info.height}
                  </span>
                )}
                {r.info.reached === false && (
                  <SignalBadge tone="tag" size="sm">
                    Above target
                  </SignalBadge>
                )}
                <Button variant="secondary" onClick={() => downloadUrl(r.url!, r.name!)}>
                  <DownloadIcon size={18} />
                  Download
                </Button>
              </>
            );
          }
          return null;
        }}
      />
      <BatchBar
        total={files.length}
        done={done}
        busy={busy}
        onRun={run}
        runLabel="Compress all"
        onZip={() =>
          useCompressResults.getState().zip(
            files.map((f) => f.id),
            "exifo-compressed.zip",
          )
        }
      />
    </ImageToolFrame>
  );
}
