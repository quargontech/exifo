"use client";

import { useMemo, useState } from "react";
import { toStripOptions, willRemove } from "@/lib/clean-options";
import { FORMAT_LABEL } from "@/lib/detect";
import { formatBytes, formatDims, listJoin } from "@/lib/format";
import { downloadUrl } from "@/lib/download";
import { AnatomyStrip } from "@/components/AnatomyStrip";
import { FileThumb } from "@/components/FileThumb";
import { MetadataReport } from "@/components/MetadataReport";
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, DownloadIcon, InfoIcon } from "@/components/icons";
import { BlockChip, SignalBadge, StatusBadge, type Status } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SkeletonStrip, Spinner } from "@/components/ui/progress";
import { hasRemovable, useClean } from "@/store/clean";
import { useFiles, type FileEntry } from "@/store/files";

export function FileCard({ entry }: { entry: FileEntry }) {
  const options = useClean((s) => s.options);
  const result = useClean((s) => s.results[entry.id]);
  const cleanOne = useClean((s) => s.cleanOne);
  const comparePixels = useClean((s) => s.comparePixels);
  const remove = useFiles((s) => s.remove);
  const [open, setOpen] = useState<boolean | null>(null);

  const a = entry.analysis;
  const planned = useMemo(() => (a ? toStripOptions(options, a) : null), [a, options]);
  const willRemoveIds = useMemo(() => {
    if (!a || !planned) return new Set<string>();
    return new Set(a.scan.blocks.filter((b) => willRemove(b, planned.options)).map((b) => b.id));
  }, [a, planned]);
  const removedIds = useMemo(() => new Set(result?.result?.removed.map((b) => b.id) ?? []), [result]);
  const removable = a ? hasRemovable(entry) : false;
  const done = result?.status === "done" ? result.result : undefined;
  const cleaning = result?.status === "cleaning";
  const reading = entry.status === "queued" || entry.status === "scanning";

  let status: Status = entry.status === "error" ? "error" : entry.status;
  if (entry.status === "ready" && !removable) status = "empty";
  if (cleaning) status = "cleaning";
  if (done) status = "done";
  if (result?.status === "error") status = "error";

  const meta = a
    ? [FORMAT_LABEL[a.scan.format], formatDims(a.scan.width, a.scan.height), done ? null : formatBytes(entry.size)].filter(Boolean).join(" · ")
    : formatBytes(entry.size);
  const reportOpen = open ?? (a?.report.aiFlag === "ai" && !done);
  const willRemoveMpf = a?.scan.blocks.some((b) => b.kind === "mpf" && willRemoveIds.has(b.id));
  const trailer = a?.scan.blocks.find((b) => b.kind === "trailer");
  const c2paBlock = a?.scan.blocks.find((b) => b.kind === "c2pa");
  const c2paKeptButChanged = !!c2paBlock && !willRemoveIds.has(c2paBlock.id) && removable;

  const action = done ? (
    <Button variant="secondary" className="w-full sm:w-auto" onClick={() => downloadUrl(done.url, done.outName)}>
      <DownloadIcon size={18} />
      Download
    </Button>
  ) : entry.status === "ready" && removable ? (
    <Button variant="primary" className="w-full px-[18px] sm:w-auto" disabled={cleaning} loading={cleaning} onClick={() => cleanOne(entry.id)}>
      {cleaning ? "Cleaning…" : "Clean"}
    </Button>
  ) : null;

  return (
    <article
      aria-label={entry.name}
      aria-busy={reading || cleaning}
      className="exifo-enter flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <div className="flex items-center gap-3 sm:gap-3.5">
        <FileThumb url={entry.url} busy={reading || cleaning} className="h-12 w-12 self-start sm:h-14 sm:w-14 sm:self-center" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 min-w-0 break-all font-mono text-[14px] font-semibold sm:text-[15px]">{entry.name}</h3>
            <StatusBadge status={status} />
            {!done && a?.report.aiFlag === "ai" && (
              <SignalBadge tone="tag" icon="info">
                AI provenance found
              </SignalBadge>
            )}
            {!done && a?.report.aiFlag === "credentials" && (
              <SignalBadge tone="tag" icon="info">
                Content Credentials found
              </SignalBadge>
            )}
            {!done && a?.report.gps && (
              <SignalBadge tone="tag" icon="pin">
                Location found
              </SignalBadge>
            )}
          </div>
          <div className="font-mono text-xs text-ink-3">{meta}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          {action && <div className="hidden sm:block">{action}</div>}
          <Button variant="ghost" size="icon" className="-mr-2 sm:mr-0" aria-label={`Remove ${entry.name} from the list`} onClick={() => remove(entry.id)}>
            <CloseIcon size={18} />
          </Button>
        </div>
      </div>

      {a ? (
        <AnatomyStrip segments={a.scan.segments} willRemove={done ? undefined : willRemoveIds} removed={done ? removedIds : undefined} busy={cleaning} />
      ) : (
        reading && <SkeletonStrip />
      )}

      {entry.status === "error" && <Notice tone="error">{entry.error}</Notice>}
      {result?.status === "error" && <Notice tone="error">{result.error}</Notice>}

      {a && !done && entry.status === "ready" && (
        <>
          {!removable ? (
            <p className="m-0 text-[13px] text-ink-2">This file has no removable metadata{a.scan.blocks.length ? " with the current options" : ""}.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              <div className="flex flex-wrap gap-2">
                {a.scan.blocks.map((b) =>
                  willRemoveIds.has(b.id) ? (
                    <BlockChip key={b.id}>
                      {b.short} {formatBytes(b.size)}
                    </BlockChip>
                  ) : (
                    <BlockChip key={b.id} kept>
                      {b.short} {formatBytes(b.size)} kept
                    </BlockChip>
                  ),
                )}
                {a.report.icc && <BlockChip kept>ICC {formatBytes(a.report.icc.size)} kept</BlockChip>}
                {a.scan.orientation > 1 && options.keepOrientation && <BlockChip kept>Orientation {a.scan.orientation} kept</BlockChip>}
              </div>
              {a.report.groups.some((g) => g.removable && g.fields.length) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:w-full max-sm:border max-sm:border-line-strong max-sm:h-11 max-sm:text-[15px] max-sm:text-ink"
                  aria-expanded={reportOpen}
                  onClick={() => setOpen(!reportOpen)}
                >
                  {reportOpen ? "Hide report" : "Show report"}
                  {reportOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                </Button>
              )}
            </div>
          )}
          {reportOpen && removable && <MetadataReport report={a.report} inspectHref="/inspect/" />}
          {a.report.aiFlag === "ai" && (
            <div className="flex gap-2 text-[13px] leading-[1.5] text-ink-2">
              <InfoIcon size={16} className="mt-0.5 shrink-0 text-tag-deep" />
              <div>This file is marked as AI-generated. You stay responsible for disclosing that where platform rules or local law require it.</div>
            </div>
          )}
          {c2paKeptButChanged && (
            <Notice tone="quiet">Content Credentials are kept, but removing other blocks changes the file, so their signature will show as invalid.</Notice>
          )}
          {willRemoveMpf && (
            <Notice tone="warning">
              This file contains extra embedded images (HDR gain map or motion photo). They will be removed. The main image is unchanged.
            </Notice>
          )}
          {!willRemoveMpf && trailer && willRemoveIds.has(trailer.id) && (
            <Notice tone="warning">
              This file has {formatBytes(trailer.size)} of extra data after the end of the image. It will be removed. The main image is unchanged.
            </Notice>
          )}
          {planned?.notes.map((n) => (
            <Notice key={n} tone="quiet">
              {n}
            </Notice>
          ))}
          {a.scan.isAnimated && <Notice tone="quiet">Animated file. Every frame and its timing are kept.</Notice>}
          {a.scan.warnings.map((w) => (
            <Notice key={w} tone="quiet">
              {w}
            </Notice>
          ))}
        </>
      )}

      {done && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="font-mono text-[13px] font-medium">
              {formatBytes(done.bytesBefore)} → {formatBytes(done.bytesAfter)}
            </div>
            <div className="text-[13px] text-ink-2">
              {done.bytesBefore >= done.bytesAfter ? `${formatBytes(done.bytesBefore - done.bytesAfter)} removed` : "XMP written"}
              {done.removed.length || done.edited.length ? `: ${listJoin([...new Set(done.removed.map((b) => b.short)), ...done.edited])}` : ""}
            </div>
            <SignalBadge tone="proof" icon="tick" className="exifo-pop [animation-delay:350ms]">
              Image data identical
            </SignalBadge>
            {result?.pixels?.status === "done" &&
              result.pixels.result &&
              (result.pixels.result.skipped ? (
                <span className="text-[13px] text-ink-3">{result.pixels.result.skipped}</span>
              ) : result.pixels.result.identical ? (
                <SignalBadge tone="proof" icon="tick" className="exifo-pop">
                  Pixels identical
                </SignalBadge>
              ) : (
                <SignalBadge tone="danger">Pixels differ</SignalBadge>
              ))}
            {!result?.pixels && (
              <Button variant="ghost" size="sm" onClick={() => comparePixels(entry.id)}>
                Compare pixels
              </Button>
            )}
            {result?.pixels?.status === "running" && (
              <span className="flex items-center gap-2 text-[13px] text-ink-3">
                <Spinner size={14} className="text-proof" />
                Comparing pixels…
              </span>
            )}
            {result?.pixels?.status === "error" && <span className="text-[13px] text-danger">{result.pixels.error}</span>}
          </div>
          {[...done.warnings, ...done.notes].map((w) => (
            <Notice key={w} tone="warning">
              {w}
            </Notice>
          ))}
        </>
      )}

      {action && <div className="sm:hidden">{action}</div>}
    </article>
  );
}
