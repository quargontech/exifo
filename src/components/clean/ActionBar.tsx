"use client";

import { useState } from "react";
import { pluralize } from "@/lib/format";
import { DownloadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { hasRemovable, useClean } from "@/store/clean";
import { useFiles } from "@/store/files";

export function ActionBar() {
  const files = useFiles((s) => s.files);
  const clear = useFiles((s) => s.clear);
  const results = useClean((s) => s.results);
  const busy = useClean((s) => s.busy);
  const cleanAll = useClean((s) => s.cleanAll);
  const downloadZip = useClean((s) => s.downloadZip);
  useClean((s) => s.options); // re-render when options change
  const [zipping, setZipping] = useState(false);

  const cleaned = files.filter((f) => results[f.id]?.status === "done").length;
  const ready = files.filter((f) => f.status === "ready" && !results[f.id] && hasRemovable(f)).length;
  const scanning = files.filter((f) => f.status === "queued" || f.status === "scanning").length;
  const failed = files.filter((f) => f.status === "error" || results[f.id]?.status === "error").length;
  const nothing = files.filter((f) => f.status === "ready" && !results[f.id] && !hasRemovable(f)).length;
  const cleaning = files.filter((f) => results[f.id]?.status === "cleaning").length;
  // One bar for whatever is running: cleaning a batch, or reading newly added files.
  const progress =
    busy || cleaning
      ? { label: "Cleaning progress", value: cleaned, max: cleaned + cleaning + ready }
      : scanning
        ? { label: "Reading files", value: files.length - scanning, max: files.length }
        : null;

  const parts = [
    cleaned && `${cleaned} cleaned`,
    ready && `${ready} ready`,
    scanning && `${scanning} scanning`,
    nothing && `${nothing} with nothing to remove`,
    failed && `${failed} failed`,
  ].filter(Boolean);

  const zip = async () => {
    setZipping(true);
    try {
      await downloadZip();
    } finally {
      setZipping(false);
    }
  };

  if (!files.length) return null;

  return (
    <>
      <section
        aria-label="Batch actions"
        className="relative hidden flex-wrap items-center justify-between gap-x-5 gap-y-3 overflow-hidden rounded-2xl border border-line bg-surface py-3 pl-5 pr-3 lg:flex"
      >
        {progress && <ProgressBar {...progress} className="absolute inset-x-0 top-0 h-1 rounded-none bg-transparent" />}
        <div className="text-sm text-ink-2" aria-live="polite">
          <span className="font-semibold text-ink">{pluralize(files.length, "file")}</span>
          {parts.length ? ` · ${parts.join(", ")}` : ""}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
          <Button variant="secondary" disabled={!cleaned || zipping} onClick={zip}>
            <DownloadIcon size={18} />
            {zipping ? "Preparing ZIP…" : "Download all (ZIP)"}
          </Button>
          <Button variant="primary" className="px-5" disabled={!ready || busy} loading={busy} onClick={() => cleanAll()}>
            {busy ? "Cleaning…" : "Clean all"}
          </Button>
        </div>
      </section>

      {/* Mobile: sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-line bg-surface px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        {progress && <ProgressBar {...progress} className="absolute inset-x-0 top-0 h-1 rounded-none bg-transparent" />}
        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-xl" aria-label="Download all as ZIP" disabled={!cleaned || zipping} onClick={zip}>
          <DownloadIcon size={20} />
        </Button>
        <Button variant="ghost" className="h-12 rounded-xl px-3" onClick={clear}>
          Clear
        </Button>
        <Button variant="primary" className="h-12 flex-1 rounded-xl text-base" disabled={!ready || busy} loading={busy} onClick={() => cleanAll()}>
          {busy ? "Cleaning…" : ready ? `Clean all · ${pluralize(ready, "file")} ready` : cleaned ? `${cleaned} cleaned` : "Clean all"}
        </Button>
      </div>
    </>
  );
}
