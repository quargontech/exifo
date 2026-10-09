"use client";

import { downloadText } from "@/lib/download";
import { exportReport, type ExportFormat } from "@/lib/export";
import { splitExt } from "@/lib/rename";
import { DownloadIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { useFiles, type FileEntry } from "@/store/files";

const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "json", label: "JSON", hint: "Full tree of every block and field" },
  { id: "csv", label: "CSV", hint: "One row per file, common fields as columns" },
  { id: "txt", label: "Text", hint: "Readable summary" },
];

/** Export the metadata report of one file, or of every scanned file in the queue. */
export function ExportMenu({ entry, label = "Export report" }: { entry: FileEntry; label?: string }) {
  const files = useFiles((s) => s.files);
  const ready = files.filter((f) => f.analysis);
  const run = (fmt: ExportFormat, all: boolean) => {
    const items = (all ? ready : [entry]).filter((f) => f.analysis).map((f) => ({ name: f.name, size: f.size, analysis: f.analysis! }));
    if (!items.length) return;
    const { text, mime, ext } = exportReport(items, fmt);
    const name = all ? `exifo-report.${ext}` : `${splitExt(entry.name)[0]}-metadata.${ext}`;
    downloadText(text, name, mime);
  };
  const items: MenuItem[] = FORMATS.map((f) => ({
    label: `${f.label}${ready.length > 1 ? ", this file" : ""}`,
    hint: f.hint,
    onSelect: () => run(f.id, false),
  }));
  if (ready.length > 1) items.push(...FORMATS.map((f) => ({ label: `${f.label}, all ${ready.length} files`, onSelect: () => run(f.id, true) })));
  return (
    <Menu
      items={items}
      trigger={({ ref, ...p }) => (
        <button ref={ref} type="button" className={buttonVariants({ variant: "secondary" })} {...p}>
          <DownloadIcon size={18} />
          {label}
        </button>
      )}
    />
  );
}
