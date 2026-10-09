"use client";

import { FORMAT_LABEL } from "@/lib/detect";
import { formatBytes, formatDims } from "@/lib/format";
import { selectClass } from "@/components/ui/controls";
import { FileThumb } from "@/components/FileThumb";
import { useFiles, type FileEntry } from "@/store/files";

/** The file being inspected or checked, with a switcher when several files are queued. */
export function FileBar({ entry, label, children }: { entry: FileEntry; label: string; children?: React.ReactNode }) {
  const files = useFiles((s) => s.files);
  const setActive = useFiles((s) => s.setActive);
  const scan = entry.analysis?.scan;
  const meta = [scan ? FORMAT_LABEL[scan.format] : FORMAT_LABEL[entry.format], scan ? formatDims(scan.width, scan.height) : "", formatBytes(entry.size)]
    .filter(Boolean)
    .join(" · ");
  return (
    <section aria-label={label} className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-surface py-3 pl-4 pr-3">
      <FileThumb url={entry.url} size={44} busy={entry.status === "queued" || entry.status === "scanning"} />
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
        {files.length > 1 ? (
          <label className="relative block max-w-[420px]">
            <span className="sr-only">Choose a file</span>
            <select
              value={entry.id}
              onChange={(e) => setActive(e.target.value)}
              className={`${selectClass} h-9 border-transparent bg-transparent pl-0 font-mono text-[15px] font-semibold hover:border-line-strong focus:pl-2 dark:bg-transparent`}
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="break-all font-mono text-[15px] font-semibold">{entry.name}</div>
        )}
        <div className="font-mono text-xs text-ink-3">{meta}</div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </section>
  );
}
