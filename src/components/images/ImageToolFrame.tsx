"use client";

import { useCallback, useState } from "react";
import type { ToolId } from "@/lib/tools";
import { ACCEPT_IMAGES, Dropzone } from "@/components/Dropzone";
import { DownloadIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { QueueNotices } from "@/components/QueueNotices";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { pluralize } from "@/lib/format";
import { useImages } from "@/store/images";

/** Header, dropzone and notices shared by the image tools. */
export function ImageToolFrame({
  tool,
  children,
  hint,
  emptyTitle,
  empty,
}: {
  tool: ToolId;
  children?: React.ReactNode;
  hint?: string;
  emptyTitle?: string;
  empty?: React.ReactNode;
}) {
  const files = useImages((s) => s.files);
  const notices = useImages((s) => s.notices);
  const add = useImages((s) => s.add);
  const dismiss = useImages((s) => s.dismissNotice);
  const onFiles = useCallback((f: File[]) => void add(f), [add]);
  const h = hint ?? "JPEG · PNG · WebP · AVIF · HEIC · GIF · BMP · up to 50 MB each";
  return (
    <>
      <PageHeader tool={tool} />
      {files.length === 0 ? (
        <>
          <Dropzone key="hero" onFiles={onFiles} accept={ACCEPT_IMAGES} title={emptyTitle} hint={h} />
          <QueueNotices notices={notices} onDismiss={dismiss} />
          {empty}
        </>
      ) : (
        <>
          <Dropzone key="compact" onFiles={onFiles} accept={ACCEPT_IMAGES} variant="compact" hint={h} />
          <QueueNotices notices={notices} onDismiss={dismiss} />
          {children}
        </>
      )}
    </>
  );
}

/** Bottom action bar: Clear, Download all (ZIP), primary action. */
export function BatchBar({
  total,
  done,
  busy,
  onRun,
  runLabel,
  onZip,
  zipDisabled,
  runDisabled,
}: {
  total: number;
  done: number;
  busy: boolean;
  onRun: () => void;
  runLabel: string;
  onZip: () => Promise<void>;
  zipDisabled?: boolean;
  runDisabled?: boolean;
}) {
  const clear = useImages((s) => s.clear);
  const [zipping, setZipping] = useState(false);
  const zip = async () => {
    setZipping(true);
    try {
      await onZip();
    } finally {
      setZipping(false);
    }
  };
  return (
    <>
      <section
        aria-label="Batch actions"
        className="relative hidden flex-wrap items-center justify-between gap-x-5 gap-y-3 overflow-hidden rounded-2xl border border-line bg-surface py-3 pl-5 pr-3 lg:flex"
      >
        {busy && <ProgressBar label="Progress" value={done} max={total} className="absolute inset-x-0 top-0 h-1 rounded-none bg-transparent" />}
        <div className="text-sm text-ink-2" aria-live="polite">
          <span className="font-semibold text-ink">{pluralize(total, "file")}</span>
          {busy ? ` · ${done} of ${total} done` : done ? ` · ${done} done` : ""}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
          <Button variant="secondary" disabled={!done || zipping || zipDisabled} onClick={zip}>
            <DownloadIcon size={18} />
            {zipping ? "Preparing ZIP…" : "Download all (ZIP)"}
          </Button>
          <Button variant="primary" className="px-5" disabled={busy || runDisabled || !total} loading={busy} onClick={onRun}>
            {busy ? "Working…" : runLabel}
          </Button>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-line bg-surface px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        {busy && <ProgressBar label="Progress" value={done} max={total} className="absolute inset-x-0 top-0 h-1 rounded-none bg-transparent" />}
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-xl"
          aria-label="Download all as ZIP"
          disabled={!done || zipping || zipDisabled}
          onClick={zip}
        >
          <DownloadIcon size={20} />
        </Button>
        <Button variant="ghost" className="h-12 rounded-xl px-3" onClick={clear}>
          Clear
        </Button>
        <Button variant="primary" className="h-12 flex-1 rounded-xl text-base" disabled={busy || runDisabled || !total} loading={busy} onClick={onRun}>
          {busy ? `Working · ${done} of ${total}` : `${runLabel} · ${pluralize(total, "file")}`}
        </Button>
      </div>
    </>
  );
}
