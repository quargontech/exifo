"use client";

import { useState } from "react";
import { OUT_LABEL, OUT_MIME, type OutFormat } from "@/lib/codecs";
import { FORMAT_LABEL } from "@/lib/detect";
import { downloadUrl } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { ImageList } from "@/components/images/ImageList";
import { BatchBar, ImageToolFrame } from "@/components/images/ImageToolFrame";
import { outName, runBatch, runJob, useResultsHousekeeping, type BuildRequest } from "@/components/images/jobs";
import { useCreditSetting } from "@/lib/credit";
import { CreditToggle } from "@/components/images/CreditToggle";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Segmented, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { Slider } from "@/components/ui/slider";
import { createResults } from "@/store/results";
import { useImages } from "@/store/images";

const useConvertResults = createResults<{ bytes: number }>();
const OUTPUTS: OutFormat[] = ["jpeg", "png", "webp", "avif"];

export function ConvertTool() {
  const files = useImages((s) => s.files);
  const results = useConvertResults((s) => s.results);
  const [format, setFormat] = useState<OutFormat>("jpeg");
  const [quality, setQuality] = useState(88);
  const [lossless, setLossless] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [credit] = useCreditSetting();

  const lossy = format === "jpeg" || ((format === "webp" || format === "avif") && !lossless);
  const key = `${format}|${quality}|${lossless}|${background}|${credit}`;
  useResultsHousekeeping(useConvertResults, key);
  const transparent = files.filter((f) => f.hasAlpha);
  const hasHeic = files.some((f) => f.format === "heic");
  const hasGif = files.some((f) => f.format === "gif");

  const build: BuildRequest = (src) => ({
    ...src,
    encode: { format, quality, lossless: (format === "webp" || format === "avif") && lossless, optimizePng: format === "png" },
    background: format === "jpeg" ? background : undefined,
    credit,
  });

  const run = async () => {
    setBusy(true);
    try {
      await runBatch(useConvertResults, files, key, async (f) => {
        const r = await runJob(f, build);
        return { blob: new Blob([r.output], { type: OUT_MIME[format] }), name: outName(f.name, format, ""), info: { bytes: r.bytes } };
      });
    } finally {
      setBusy(false);
    }
  };
  const done = files.filter((f) => results[f.id]?.status === "done").length;

  return (
    <ImageToolFrame
      tool="convert"
      emptyTitle="Drop images to convert"
      empty={<Notice tone="quiet">HEIC photos from iPhones are decoded on your device. Nothing is uploaded.</Notice>}
    >
      <section aria-label="Settings" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Field label="Convert to">
            <Segmented label="Output format" value={format} onChange={setFormat} options={OUTPUTS.map((o) => ({ value: o, label: OUT_LABEL[o] }))} />
          </Field>
          {(format === "webp" || format === "avif") && <Switch checked={lossless} onChange={setLossless} label="Lossless" className="pb-2.5" />}
          {format === "jpeg" && (
            <Field label="Background for transparent areas" htmlFor="cv-bg">
              <div className="flex items-center gap-2">
                <input
                  id="cv-bg"
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-[10px] border border-line-strong bg-surface p-1"
                />
                <span className="font-mono text-[13px] text-ink-2">{background.toUpperCase()}</span>
              </div>
            </Field>
          )}
        </div>
        {lossy && (
          <div className="max-w-md">
            <Slider label="Quality" value={quality} onChange={setQuality} min={1} max={100} />
          </div>
        )}
        {format === "png" && <p className="m-0 text-[13px] text-ink-3">PNG is lossless and optimised with OxiPNG.</p>}
        {format === "jpeg" && transparent.length > 0 && (
          <Notice tone="quiet">
            JPEG has no transparency. Transparent areas in {transparent.length === 1 ? transparent[0].name : `${transparent.length} files`} are filled with the
            background colour.
          </Notice>
        )}
        {hasHeic && <Notice tone="quiet">HEIC files are decoded on your device the first time they are converted, which can take a few seconds.</Notice>}
        {hasGif && <Notice tone="quiet">Animated GIFs are converted from their first frame.</Notice>}
        <CreditToggle />
      </section>

      <ImageList
        selectable={false}
        busy={(f) => results[f.id]?.status === "working"}
        right={(f) => {
          const r = results[f.id];
          if (r?.status === "working") return <StatusBadge status="processing" label="Converting" />;
          if (r?.status === "error") return <span className="max-w-[260px] text-[13px] text-danger">{r.error}</span>;
          if (r?.status === "done")
            return (
              <>
                <span className="flex items-center gap-1.5 font-mono text-[13px]">
                  {FORMAT_LABEL[f.format]} <ArrowRightIcon size={14} /> {OUT_LABEL[format]} · {formatBytes(r.info?.bytes ?? 0)}
                </span>
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
        onRun={run}
        runLabel={`Convert to ${OUT_LABEL[format]}`}
        onZip={() =>
          useConvertResults.getState().zip(
            files.map((f) => f.id),
            "exifo-converted.zip",
          )
        }
      />
    </ImageToolFrame>
  );
}
