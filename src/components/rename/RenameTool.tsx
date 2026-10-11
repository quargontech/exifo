"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/download";
import { DEFAULT_RENAME, previewRename, RENAME_TOKENS, uniqueNames, type RenameSettings } from "@/lib/rename";
import { makeZip } from "@/lib/zip";
import { ImageToolFrame } from "@/components/images/ImageToolFrame";
import { FileThumb } from "@/components/FileThumb";
import { ArrowRightIcon, CloseIcon, DownloadIcon } from "@/components/icons";
import { SignalBadge } from "@/components/ui/badges";
import { SaveToFolderButton } from "@/components/FileActions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { useImages } from "@/store/images";

export function RenameTool() {
  const files = useImages((s) => s.files);
  const remove = useImages((s) => s.remove);
  const clear = useImages((s) => s.clear);
  const [s, setS] = useState<RenameSettings>(DEFAULT_RENAME);
  const [zipping, setZipping] = useState(false);
  const patternRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      previewRename(
        files.map((f) => ({
          name: f.name,
          lastModified: f.file.lastModified,
          width: f.width,
          height: f.height,
          dateTaken: f.dateTaken,
          make: f.make,
          model: f.model,
        })),
        s,
      ),
    [files, s],
  );
  const dupes = rows.filter((r) => r.duplicate).length;
  const noDate = files.filter((f) => !f.dateTaken).length;

  const insert = (token: string) => {
    const el = patternRef.current;
    const start = el?.selectionStart ?? s.pattern.length;
    const end = el?.selectionEnd ?? s.pattern.length;
    const pattern = s.pattern.slice(0, start) + token + s.pattern.slice(end);
    setS({ ...s, pattern });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const download = async () => {
    setZipping(true);
    try {
      const names = uniqueNames(rows.map((r) => r.to));
      // The contents are unchanged, so one file is simply saved under its new name.
      if (files.length === 1) return downloadBlob(files[0].file, names[0]);
      const entries = await Promise.all(
        files.map(async (f, i) => ({ name: names[i], data: new Uint8Array(await f.file.arrayBuffer()), lastModified: f.file.lastModified })),
      );
      downloadBlob(await makeZip(entries), "exifo-renamed.zip");
    } finally {
      setZipping(false);
    }
  };

  return (
    <ImageToolFrame tool="rename" emptyTitle="Drop images to rename">
      <section aria-label="Pattern" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <Field label="Name pattern" htmlFor="rn-pattern" hint="The file extension is kept. Characters that are not allowed in file names are replaced.">
          <input
            ref={patternRef}
            id="rn-pattern"
            className={`${inputClass} font-mono`}
            value={s.pattern}
            onChange={(e) => setS({ ...s, pattern: e.target.value })}
            spellCheck={false}
          />
        </Field>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Insert a token">
          {RENAME_TOKENS.map((t) => (
            <button
              key={t.token}
              type="button"
              onClick={() => insert(t.token)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] hover:bg-surface-2"
            >
              <span className="font-mono font-semibold">{t.token}</span>
              <span className="text-ink-3">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Counter starts at" htmlFor="rn-start">
            <input
              id="rn-start"
              type="number"
              min={0}
              className={`${inputClass} w-28`}
              value={s.start}
              onChange={(e) => setS({ ...s, start: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Counter digits" htmlFor="rn-pad">
            <input
              id="rn-pad"
              type="number"
              min={1}
              max={8}
              className={`${inputClass} w-28`}
              value={s.pad}
              onChange={(e) => setS({ ...s, pad: Math.min(8, Math.max(1, Number(e.target.value) || 1)) })}
            />
          </Field>
          <Switch checked={s.lowerExt} onChange={(lowerExt) => setS({ ...s, lowerExt })} label="Lower-case extension" className="pb-2.5" />
        </div>
        {noDate > 0 && s.pattern.includes("{date}") && (
          <Notice tone="quiet">
            {noDate === files.length ? "These files have" : `${noDate} of ${files.length} files have`} no EXIF date taken, so {"{date}"} uses the file&apos;s
            modified date.
          </Notice>
        )}
      </section>

      <section aria-label="Preview" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[17px] font-semibold">Preview</h2>
          {dupes > 0 ? (
            <SignalBadge tone="tag" icon="info">
              {dupes} duplicate names, numbered in the ZIP
            </SignalBadge>
          ) : (
            <span className="text-[13px] text-ink-3">All names are unique</span>
          )}
        </div>
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {files.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <FileThumb url={f.url ?? undefined} size={36} />
              <span className="min-w-0 flex-[1_1_160px] break-all font-mono text-[13px] text-ink-2">{rows[i]?.from}</span>
              <ArrowRightIcon size={16} className="shrink-0 text-ink-3" />
              <span className={cn("min-w-0 flex-[1_1_160px] break-all font-mono text-[13px] font-semibold", rows[i]?.duplicate && "text-tag-deep")}>
                {rows[i]?.to}
              </span>
              <Button variant="ghost" size="iconSm" aria-label={`Remove ${f.name}`} onClick={() => remove(f.id)}>
                <CloseIcon size={16} />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button variant="primary" className="px-5" disabled={!files.length || zipping} onClick={download}>
            <DownloadIcon size={18} />
            {files.length === 1 ? "Download renamed file" : zipping ? "Preparing ZIP…" : `Download ${files.length} renamed files (ZIP)`}
          </Button>
          <SaveToFolderButton getFiles={() => uniqueNames(rows.map((r) => r.to)).map((name, i) => ({ name, blob: files[i].file }))} count={files.length} />
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
          <span className="text-[13px] text-ink-3">File contents are not changed.</span>
        </div>
      </section>
    </ImageToolFrame>
  );
}
