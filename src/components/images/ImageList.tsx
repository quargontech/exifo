"use client";

import { cn } from "@/lib/cn";
import { FORMAT_LABEL } from "@/lib/detect";
import { formatBytes, formatDims } from "@/lib/format";
import { FileThumb } from "@/components/FileThumb";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useImages, type ImageEntry } from "@/store/images";

/** File list for the image tools. Clicking a row selects it for the preview. */
export function ImageList({
  right,
  selectable = true,
  extra,
  busy,
}: {
  right?: (f: ImageEntry) => React.ReactNode;
  selectable?: boolean;
  extra?: (f: ImageEntry) => React.ReactNode;
  /** Whether a file is being processed; its thumbnail shows a scan line. */
  busy?: (f: ImageEntry) => boolean;
}) {
  const files = useImages((s) => s.files);
  const selectedId = useImages((s) => s.selectedId);
  const select = useImages((s) => s.select);
  const remove = useImages((s) => s.remove);
  if (!files.length) return null;
  return (
    <section aria-label="Files" className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {files.map((f) => {
        const on = selectable && f.id === selectedId && files.length > 1;
        const working = f.status === "decoding" || !!busy?.(f);
        return (
          <div
            key={f.id}
            aria-busy={working || undefined}
            className={cn("exifo-enter flex flex-wrap items-center gap-3 px-4 py-3", on && "bg-ground dark:bg-surface-2")}
          >
            {selectable && files.length > 1 ? (
              <button type="button" onClick={() => select(f.id)} aria-pressed={on} aria-label={`Preview ${f.name}`} className="rounded-[10px]">
                <FileThumb
                  url={f.url ?? undefined}
                  size={44}
                  busy={working}
                  tone="proof"
                  className={cn(on && "ring-2 ring-proof ring-offset-2 ring-offset-surface")}
                />
              </button>
            ) : (
              <FileThumb url={f.url ?? undefined} size={44} busy={working} tone="proof" />
            )}
            <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
              {selectable && files.length > 1 ? (
                <button
                  type="button"
                  onClick={() => select(f.id)}
                  className="-my-1.5 self-start break-all py-1.5 text-left font-mono text-sm font-semibold hover:underline"
                >
                  {f.name}
                </button>
              ) : (
                <span className="break-all font-mono text-sm font-semibold">{f.name}</span>
              )}
              <div className="font-mono text-xs text-ink-3">
                {[FORMAT_LABEL[f.format], formatDims(f.width, f.height), formatBytes(f.size)].filter(Boolean).join(" · ")}
                {f.status === "decoding" && " · decoding…"}
              </div>
              {f.animated && <div className="text-[13px] text-tag-deep">Animated: only the first frame is kept.</div>}
              {f.error && <div className="text-[13px] text-danger">{f.error}</div>}
              {extra?.(f)}
            </div>
            {right && <div className="flex flex-wrap items-center gap-2">{right(f)}</div>}
            <Button variant="ghost" size="icon" aria-label={`Remove ${f.name}`} onClick={() => remove(f.id)}>
              <CloseIcon size={18} />
            </Button>
          </div>
        );
      })}
    </section>
  );
}
