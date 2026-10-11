"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { FORMAT_LABEL } from "@/lib/detect";
import { diffBlocks, diffFields, type DiffStatus } from "@/lib/diff";
import { formatBytes, formatDims, pluralize, truncate } from "@/lib/format";
import type { Analysis } from "@/lib/report";
import { stripWorker } from "@/lib/workers";
import { Dropzone, usePasteFiles } from "@/components/Dropzone";
import { FileThumb } from "@/components/FileThumb";
import { CloseIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { SignalBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { errorMessage, MAX_FILE_BYTES, rejectionText, sniff, transfer } from "@/store/files";

interface Slot {
  file: File;
  url: string;
  status: "scanning" | "ready" | "error";
  analysis?: Analysis;
  hash?: string;
  error?: string;
}

/** Below sm, table rows stack: the name, then labelled A and B values, then the status. */
const STACK = {
  table: "max-sm:block",
  head: "max-sm:hidden",
  body: "max-sm:block",
  row: "max-sm:block max-sm:py-2.5",
  cell: "max-sm:block max-sm:py-0.5 max-sm:pr-0",
  a: "max-sm:before:mr-2 max-sm:before:font-sans max-sm:before:font-semibold max-sm:before:text-ink-3 max-sm:before:content-['A']",
  b: "max-sm:before:mr-2 max-sm:before:font-sans max-sm:before:font-semibold max-sm:before:text-ink-3 max-sm:before:content-['B']",
  status: "max-sm:block max-sm:pt-1 max-sm:text-left",
};

const STATUS_TEXT: Record<DiffStatus, string> = { "only-a": "Only in A", "only-b": "Only in B", different: "Different", same: "Same" };

function StatusPill({ s }: { s: DiffStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2 font-sans text-xs font-semibold",
        s === "different" && "bg-tag-tint text-tag-deep",
        s === "only-a" && "bg-proof-tint text-proof",
        s === "only-b" && "bg-surface-2 text-ink",
        s === "same" && "text-ink-3",
      )}
    >
      {STATUS_TEXT[s]}
    </span>
  );
}

export function CompareTool() {
  const [a, setA] = useState<Slot | null>(null);
  const [b, setB] = useState<Slot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"diff" | "all">("diff");

  const load = useCallback(async (file: File, setSlot: (s: Slot | null) => void) => {
    if (file.size > MAX_FILE_BYTES) {
      setNotice(`${file.name} is larger than 50 MB.`);
      return;
    }
    const fmt = await sniff(file);
    if (fmt !== "jpeg" && fmt !== "png" && fmt !== "webp") {
      setNotice(rejectionText(file.name, fmt));
      return;
    }
    const url = URL.createObjectURL(file);
    setSlot({ file, url, status: "scanning" });
    try {
      const [b1, b2] = await Promise.all([file.arrayBuffer(), file.arrayBuffer()]);
      const analysis = await stripWorker().call((api) => api.analyze(transfer(b1)));
      const hash = await stripWorker().call((api) => api.imageHash(transfer(b2)));
      setSlot({ file, url, status: "ready", analysis, hash });
    } catch (err) {
      setSlot({ file, url, status: "error", error: errorMessage(err) });
    }
  }, []);

  const onFiles = useCallback(
    (files: File[], target?: "a" | "b") => {
      setNotice(null);
      const used = files.length >= 2 && !target ? 2 : 1;
      if (files.length > used) {
        const extra = files.length - used;
        setNotice(`Compare looks at two files at a time, so ${extra === 1 ? "1 other file was" : `${extra} other files were`} not added.`);
      }
      if (used === 2) {
        void load(files[0], setA);
        void load(files[1], setB);
        return;
      }
      const slot = target ?? (!a ? "a" : "b");
      void load(files[0], slot === "a" ? setA : setB);
    },
    [a, load],
  );
  usePasteFiles(onFiles);

  const fieldDiff = useMemo(() => (a?.analysis && b?.analysis ? diffFields(a.analysis, b.analysis) : []), [a, b]);
  const blockDiff = useMemo(() => (a?.analysis && b?.analysis ? diffBlocks(a.analysis, b.analysis) : []), [a, b]);
  const shownFields = view === "diff" ? fieldDiff.filter((r) => r.status !== "same") : fieldDiff;
  const ready = a?.status === "ready" && b?.status === "ready";
  const sameFormat = ready && a.analysis!.scan.format === b.analysis!.scan.format;
  const identical = ready && sameFormat && a.hash === b.hash;
  const counts = {
    different: fieldDiff.filter((r) => r.status === "different").length,
    onlyA: fieldDiff.filter((r) => r.status === "only-a").length,
    onlyB: fieldDiff.filter((r) => r.status === "only-b").length,
  };
  const metaSame = counts.different === 0 && counts.onlyA === 0 && counts.onlyB === 0;

  const slotView = (slot: Slot | null, label: "A" | "B", set: (s: Slot | null) => void) =>
    slot ? (
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface py-3 pl-4 pr-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-fg">{label}</span>
        <FileThumb url={slot.url} size={44} busy={slot.status === "scanning"} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="truncate font-mono text-sm font-semibold">{slot.file.name}</div>
          <div className="font-mono text-xs text-ink-3">
            {slot.analysis ? `${FORMAT_LABEL[slot.analysis.scan.format]} · ${formatDims(slot.analysis.scan.width, slot.analysis.scan.height)} · ` : ""}
            {formatBytes(slot.file.size)}
            {slot.status === "scanning" && " · reading…"}
          </div>
          {slot.error && <div className="text-[13px] text-danger">{slot.error}</div>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove file ${label}`}
          onClick={() => {
            URL.revokeObjectURL(slot.url);
            set(null);
          }}
        >
          <CloseIcon size={18} />
        </Button>
      </div>
    ) : (
      <Dropzone
        variant="panel"
        className="min-h-[200px] gap-3 py-6"
        title={`File ${label}`}
        hint="JPEG · PNG · WebP"
        multiple={label === "A"}
        paste={false}
        onFiles={(f) => onFiles(f, label === "A" && f.length < 2 ? "a" : label === "B" ? "b" : undefined)}
        browseLabel={`Choose file ${label}`}
      />
    );

  return (
    <>
      <PageHeader tool="compare" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {slotView(a, "A", setA)}
        {slotView(b, "B", setB)}
      </div>
      {notice && (
        <Notice tone="warning" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      )}
      {!a && !b && <p className="m-0 text-[13px] text-ink-3">Tip: drop two files on A to fill both slots, for example an original and its cleaned copy.</p>}

      {ready && (
        <>
          <section aria-label="Image data" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
            <h2 className="m-0 text-[15px] font-semibold">Image data</h2>
            {!sameFormat ? (
              <span className="text-sm text-ink-2">Different formats, so the image data cannot be compared byte for byte.</span>
            ) : identical ? (
              <>
                <SignalBadge tone="proof" icon="tick">
                  {metaSame ? "Files identical" : "Image data identical"}
                </SignalBadge>
                <span className="text-sm text-ink-2">
                  {metaSame
                    ? "These two files are identical: the same image data and the same metadata."
                    : "Both files hold the same compressed image. Only metadata differs."}
                </span>
              </>
            ) : (
              <>
                <SignalBadge tone="tag">Image data differs</SignalBadge>
                <span className="text-sm text-ink-2">The pixels were re-encoded or changed.</span>
              </>
            )}
            <div className="basis-full font-mono text-xs text-ink-3 [overflow-wrap:anywhere]">
              A {a.hash?.slice(0, 16)}… · B {b.hash?.slice(0, 16)}… (SHA-256 of image data)
            </div>
          </section>

          <section aria-label="Blocks" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="m-0 text-[17px] font-semibold">Blocks</h2>
            <div className="overflow-x-auto">
              <table className={cn("w-full border-collapse text-left text-[13px] sm:min-w-[480px]", STACK.table)}>
                <thead className={STACK.head}>
                  <tr className="text-ink-2">
                    <th scope="col" className="pb-2 font-semibold">
                      Block
                    </th>
                    <th scope="col" className="pb-2 font-semibold">
                      A
                    </th>
                    <th scope="col" className="pb-2 font-semibold">
                      B
                    </th>
                    <th scope="col" className="pb-2 font-semibold">
                      <span className="sr-only">Status</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={cn("font-mono text-xs", STACK.body)}>
                  {blockDiff.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={4} className="py-2.5 font-sans text-ink-2">
                        Neither file has metadata blocks.
                      </td>
                    </tr>
                  )}
                  {blockDiff.map((r) => (
                    <tr key={r.label} className={cn("border-t border-line", STACK.row)}>
                      <td className={cn("py-2.5 pr-3", STACK.cell)}>{r.label}</td>
                      <td className={cn("py-2.5 pr-3 text-ink-2", STACK.cell, STACK.a)}>{r.a ?? "–"}</td>
                      <td className={cn("py-2.5 pr-3 text-ink-2", STACK.cell, STACK.b)}>{r.b ?? "–"}</td>
                      <td className={cn("py-2.5 text-right", STACK.status)}>
                        <StatusPill s={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Fields" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 className="m-0 text-[17px] font-semibold">Fields</h2>
                <div className="text-[13px] text-ink-3">
                  {pluralize(counts.different, "difference")} · {counts.onlyA} only in A · {counts.onlyB} only in B
                </div>
              </div>
              <Segmented
                label="Show"
                value={view}
                onChange={setView}
                options={[
                  { value: "diff", label: "Differences" },
                  { value: "all", label: "All fields" },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className={cn("w-full border-collapse text-left text-[13px] sm:min-w-[640px]", STACK.table)}>
                <thead className={STACK.head}>
                  <tr className="text-ink-2">
                    <th scope="col" className="w-[22%] pb-2 font-semibold">
                      Field
                    </th>
                    <th scope="col" className="pb-2 font-semibold">
                      A
                    </th>
                    <th scope="col" className="pb-2 font-semibold">
                      B
                    </th>
                    <th scope="col" className="w-[90px] pb-2">
                      <span className="sr-only">Status</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={cn("font-mono text-xs", STACK.body)}>
                  {shownFields.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={4} className="py-2.5 font-sans text-ink-2">
                        {view === "diff" ? "No differences in readable fields." : "No readable fields."}
                      </td>
                    </tr>
                  )}
                  {shownFields.map((r, i) => (
                    <tr key={i} className={cn("border-t border-line align-top", STACK.row)}>
                      <td className={cn("py-2.5 pr-3", STACK.cell)}>
                        <div className="font-sans text-xs text-ink-3">{r.group}</div>
                        {r.key}
                      </td>
                      <td className={cn("py-2.5 pr-3 [overflow-wrap:anywhere]", STACK.cell, STACK.a, r.a === undefined && "text-ink-3")}>
                        {r.a === undefined ? "–" : truncate(r.a, 240)}
                      </td>
                      <td className={cn("py-2.5 pr-3 [overflow-wrap:anywhere]", STACK.cell, STACK.b, r.b === undefined && "text-ink-3")}>
                        {r.b === undefined ? "–" : truncate(r.b, 240)}
                      </td>
                      <td className={cn("py-2.5 text-right", STACK.status)}>
                        <StatusPill s={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
