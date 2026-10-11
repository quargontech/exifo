"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FORMAT_LABEL, FORMAT_MIME, FORMAT_EXT } from "@/lib/detect";
import { downloadUrl } from "@/lib/download";
import { formatBytes, formatDims, pluralize } from "@/lib/format";
import { splitExt } from "@/lib/rename";
import type { Descriptive } from "@/lib/report";
import { buildXmpPacket, hasAnyField, type DescriptiveFields } from "@/lib/xmp-write";
import { stripWorker } from "@/lib/workers";
import { Dropzone } from "@/components/Dropzone";
import { FileThumb } from "@/components/FileThumb";
import { CloseIcon, DownloadIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { QueueNotices } from "@/components/QueueNotices";
import { SignalBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, inputClass, selectClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { createResults } from "@/store/results";
import { errorMessage, transfer, useFiles, type FileEntry } from "@/store/files";

const useEditResults = createResults<{ removedC2pa: boolean }>();

interface Form {
  title: string;
  description: string;
  creator: string;
  copyright: string;
  credit: string;
  keywords: string;
  dateCreated: string;
}

const EMPTY: Form = { title: "", description: "", creator: "", copyright: "", credit: "", keywords: "", dateCreated: "" };

function fromDescriptive(d?: Descriptive): Form {
  if (!d) return EMPTY;
  return {
    title: d.title ?? "",
    description: d.description ?? "",
    creator: (d.creator ?? []).join("; "),
    copyright: d.copyright ?? "",
    credit: d.credit ?? "",
    keywords: (d.keywords ?? []).join(", "),
    dateCreated: (d.dateCreated ?? "").slice(0, 10),
  };
}

function toFields(f: Form): DescriptiveFields {
  const split = (s: string, sep: RegExp) =>
    s
      .split(sep)
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    title: f.title,
    description: f.description,
    creator: split(f.creator, /;/),
    copyright: f.copyright,
    credit: f.credit,
    keywords: [...new Set(split(f.keywords, /[,;]/))],
    dateCreated: f.dateCreated,
  };
}

const editedName = (e: FileEntry) => {
  const [base, ext] = splitExt(e.name);
  return `${base}-edited${ext || `.${FORMAT_EXT[e.format]}`}`;
};

export function EditTool() {
  const files = useFiles((s) => s.files);
  const notices = useFiles((s) => s.notices);
  const add = useFiles((s) => s.add);
  const remove = useFiles((s) => s.remove);
  const dismiss = useFiles((s) => s.dismissNotice);
  const results = useEditResults((s) => s.results);
  const onFiles = useCallback((f: File[]) => void add(f), [add]);

  const ready = files.filter((f) => f.status === "ready" && f.analysis);
  const [form, setForm] = useState<Form>(EMPTY);
  const [source, setSource] = useState<string | null>(null);
  // Off by default: Edit is not a way to strip provenance; signed files are skipped unless the user opts in.
  const [removeC2pa, setRemoveC2paState] = useState(false);
  const setRemoveC2pa = (v: boolean) => {
    setRemoveC2paState(v);
    useEditResults.getState().reset();
  };
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Prefill from the first scanned file once.
  useEffect(() => {
    if (source === null && ready[0]) {
      setSource(ready[0].id);
      setForm(fromDescriptive(ready[0].analysis!.report.descriptive));
    }
  }, [ready, source]);

  useEffect(() => useEditResults.getState().keepOnly(files.map((f) => f.id)), [files]);

  const fields = useMemo(() => toFields(form), [form]);
  const withXmp = ready.filter((f) => f.analysis!.scan.blocks.some((b) => b.kind === "xmp"));
  const withC2pa = ready.filter((f) => f.analysis!.scan.blocks.some((b) => b.kind === "c2pa"));
  const withSourceType = withXmp.filter((f) => f.analysis!.report.digitalSourceType);
  const targets = ready.filter((f) => removeC2pa || !withC2pa.includes(f));
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    useEditResults.getState().reset();
  };

  const write = async () => {
    setBusy(true);
    const store = useEditResults.getState();
    try {
      for (const f of targets) {
        store.start(f.id);
        try {
          const hasC2pa = withC2pa.includes(f);
          const buf = await f.file.arrayBuffer();
          // Per file, so an existing AI source label in the old XMP is written into the new packet.
          const xmp = buildXmpPacket({ ...fields, digitalSourceType: f.analysis!.report.digitalSourceType });
          // A new creator or copyright replaces the old EXIF Artist / Copyright rather than contradicting it.
          const owner = !!(fields.creator?.length || fields.copyright?.trim());
          const res = await stripWorker().call((api) =>
            api.clean(transfer(buf), { remove: hasC2pa ? ["c2pa"] : [], keepOrientation: true, xmp, exifEdits: owner ? { owner } : undefined }),
          );
          store.succeed(f.id, new Blob([res.output], { type: FORMAT_MIME[f.format] }), editedName(f), { removedC2pa: hasC2pa });
        } catch (err) {
          store.fail(f.id, errorMessage(err));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const doneCount = files.filter((f) => results[f.id]?.status === "done").length;

  return (
    <>
      <PageHeader tool="edit" badge="lossless" />
      {files.length === 0 ? (
        <Dropzone key="hero" onFiles={onFiles} title="Drop images to edit" hint="JPEG · PNG · WebP · one file or a whole batch" />
      ) : (
        <Dropzone key="compact" onFiles={onFiles} variant="compact" compactTitle="Add more images to the batch" />
      )}
      <QueueNotices notices={notices} onDismiss={dismiss} />

      {files.length > 0 && (
        <>
          <section aria-label="Fields to write" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[17px] font-semibold">Fields</h2>
              {ready.length > 1 && (
                <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-ink-2">
                  Start from
                  <select
                    className={`${selectClass} h-10 w-auto min-w-[180px] text-sm`}
                    value={source ?? ""}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setForm(fromDescriptive(ready.find((f) => f.id === e.target.value)?.analysis?.report.descriptive));
                    }}
                  >
                    {ready.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="ed-title">
                <input id="ed-title" className={inputClass} value={form.title} onChange={set("title")} />
              </Field>
              <Field label="Creator" htmlFor="ed-creator" hint="Separate several creators with a semicolon.">
                <input id="ed-creator" className={inputClass} value={form.creator} onChange={set("creator")} autoComplete="name" />
              </Field>
              <Field label="Description" htmlFor="ed-desc" className="sm:col-span-2">
                <textarea id="ed-desc" rows={3} className={`${inputClass} h-auto py-2.5`} value={form.description} onChange={set("description")} />
              </Field>
              <Field label="Copyright notice" htmlFor="ed-rights">
                <input id="ed-rights" className={inputClass} value={form.copyright} onChange={set("copyright")} placeholder="© 2026 Your Name" />
              </Field>
              <Field label="Credit" htmlFor="ed-credit">
                <input id="ed-credit" className={inputClass} value={form.credit} onChange={set("credit")} />
              </Field>
              <Field label="Keywords" htmlFor="ed-kw" hint="Separate with commas.">
                <input id="ed-kw" className={inputClass} value={form.keywords} onChange={set("keywords")} />
              </Field>
              <Field label="Date created" htmlFor="ed-date">
                <input id="ed-date" type="date" className={inputClass} value={form.dateCreated} onChange={set("dateCreated")} />
              </Field>
            </div>
            <p className="m-0 text-[13px] leading-[1.5] text-ink-3">
              Written as one XMP packet (Dublin Core and Photoshop fields). The image data is copied byte for byte. When you set a creator or copyright, the old
              EXIF Artist and Copyright are removed so the file does not name two owners; everything else in EXIF and IPTC stays.
            </p>
            {withXmp.length > 0 && (
              <Notice tone="warning">
                {withXmp.length === ready.length && ready.length === 1
                  ? "This file already has XMP."
                  : `${pluralize(withXmp.length, "file")} already ${withXmp.length === 1 ? "has" : "have"} XMP.`}{" "}
                It will be replaced by these fields, so anything else in the existing XMP block (edit history, camera settings) is not kept.
                {withSourceType.length > 0 && " Its AI source label (IPTC digital source type) is carried over into the new XMP."}
              </Notice>
            )}
            {withC2pa.length > 0 && (
              <Notice tone="warning">
                <div className="flex flex-col gap-2.5">
                  <span>
                    {pluralize(withC2pa.length, "file")} {withC2pa.length === 1 ? "has" : "have"} Content Credentials. Editing changes the file, so they would
                    show as invalid. {withC2pa.length === 1 ? "It is" : "They are"} skipped unless you choose to remove the Content Credentials.
                  </span>
                  <Switch checked={removeC2pa} onChange={setRemoveC2pa} label="Remove the Content Credentials and edit these files too" />
                </div>
              </Notice>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" className="px-5" disabled={!targets.length || !hasAnyField(fields) || busy} loading={busy} onClick={write}>
                {busy ? "Writing…" : `Write to ${pluralize(targets.length, "file")}`}
              </Button>
              {doneCount > 1 && (
                <Button
                  variant="secondary"
                  disabled={zipping}
                  onClick={async () => {
                    setZipping(true);
                    await useEditResults.getState().zip(
                      files.map((f) => f.id),
                      "exifo-edited.zip",
                    );
                    setZipping(false);
                  }}
                >
                  <DownloadIcon size={18} />
                  Download all (ZIP)
                </Button>
              )}
              {!hasAnyField(fields) && <span className="text-[13px] text-ink-3">Fill in at least one field.</span>}
            </div>
          </section>

          <section aria-label="Files" className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
            {files.map((f) => {
              const r = results[f.id];
              const scan = f.analysis?.scan;
              const skipped = !removeC2pa && withC2pa.includes(f);
              return (
                <div key={f.id} className="exifo-enter flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileThumb url={f.url} size={44} busy={r?.status === "working" || f.status === "queued" || f.status === "scanning"} />
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-sm font-semibold">{f.name}</span>
                      {r?.status === "done" ? (
                        <SignalBadge tone="proof" icon="tick" size="sm" className="exifo-pop">
                          Written · image data identical
                        </SignalBadge>
                      ) : r?.status === "working" ? (
                        <StatusBadge status="processing" label="Writing" />
                      ) : f.status !== "ready" ? (
                        <StatusBadge status={f.status === "error" ? "error" : "scanning"} />
                      ) : skipped ? (
                        <StatusBadge status="queued" label="Skipped" />
                      ) : null}
                    </div>
                    <div className="font-mono text-xs text-ink-3">
                      {scan ? `${FORMAT_LABEL[scan.format]} · ${formatDims(scan.width, scan.height)} · ` : ""}
                      {formatBytes(f.size)}
                      {r?.info?.removedC2pa ? " · Content Credentials removed" : ""}
                    </div>
                    {(r?.status === "error" || f.status === "error") && <div className="text-[13px] text-danger">{r?.error ?? f.error}</div>}
                  </div>
                  {r?.status === "done" && r.url && (
                    <Button variant="secondary" onClick={() => downloadUrl(r.url!, r.name!)}>
                      <DownloadIcon size={18} />
                      Download
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Remove ${f.name}`} onClick={() => remove(f.id)}>
                    <CloseIcon size={18} />
                  </Button>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
