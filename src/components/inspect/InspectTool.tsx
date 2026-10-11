"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatBytes, formatOffset, pluralize } from "@/lib/format";
import type { FieldGroup, ReportField } from "@/lib/report";
import type { Segment } from "@/lib/types";
import { AnatomyStrip } from "@/components/AnatomyStrip";
import { Dropzone } from "@/components/Dropzone";
import { ExportMenu } from "@/components/ExportMenu";
import { FileBar } from "@/components/FileBar";
import { CopyIcon, PinIcon, TickIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { QueueNotices } from "@/components/QueueNotices";
import { buttonVariants } from "@/components/ui/button";
import { inputClass } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { ReadingCard } from "@/components/ui/progress";
import { activateAndAdd, useActiveFile } from "@/store/actions";
import { useFiles } from "@/store/files";
import { LocationPreview } from "./LocationPreview";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : `Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 opacity-0 transition-opacity hover:bg-surface-2 hover:text-ink focus:opacity-100 group-hover:opacity-100 max-md:opacity-100"
    >
      {copied ? <TickIcon size={15} className="text-proof" /> : <CopyIcon size={15} />}
    </button>
  );
}

function FieldValue({ f }: { f: ReportField }) {
  const [more, setMore] = useState(false);
  const long = f.value.length > 320;
  const text = long && !more ? `${f.value.slice(0, 300)} …` : f.value;
  return (
    <div className="min-w-0">
      <span className={cn("whitespace-pre-wrap [overflow-wrap:anywhere]", f.ai && "font-semibold text-tag-deep")}>{text}</span>
      {long && (
        <button type="button" onClick={() => setMore(!more)} className="ml-1 font-sans text-xs font-semibold text-proof hover:text-proof-hover">
          {more ? "Show less" : `Show all ${f.value.length.toLocaleString()} characters`}
        </button>
      )}
    </div>
  );
}

function Group({ g, children }: { g: FieldGroup; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className={cn("h-2.5 w-2.5 rounded-[3px]", g.removable ? "bg-tag" : "bg-kept")} aria-hidden="true" />
        <h3 className="m-0 text-sm font-semibold">{g.title}</h3>
        <span className="font-mono text-xs text-ink-3">{g.source}</span>
        {g.kind === "gps" && (
          <span className="inline-flex h-6 items-center gap-[5px] rounded-full bg-tag-tint px-[9px] text-xs font-semibold text-tag-deep">
            <PinIcon size={13} />
            This photo contains a location
          </span>
        )}
      </div>
      <table className="w-full border-collapse text-left font-mono text-[12.5px]">
        <tbody>
          {g.fields.map((f, i) => (
            <tr key={`${f.key}-${i}`} className="group border-t border-line align-top">
              <th scope="row" className="w-[40%] py-[9px] pr-3 font-normal text-ink-2 [overflow-wrap:anywhere]">
                {f.key}
              </th>
              <td className="py-[9px]">
                <FieldValue f={f} />
              </td>
              <td className="w-8 py-1 pl-1 align-middle">
                <CopyButton value={f.value} label={f.key} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {children}
    </div>
  );
}

interface StructRow {
  name: string;
  offset: number;
  size: number;
  meta: boolean;
  count: number;
}

function structureRows(segments: Segment[]): StructRow[] {
  const rows: StructRow[] = [];
  for (const s of segments) {
    const meta = s.role === "meta";
    const last = rows[rows.length - 1];
    if (last && !meta && !last.meta && last.name.replace(/ × \d+$/, "") === s.name && s.name !== "SOS + scan data") {
      last.count++;
      last.size += s.size;
      last.name = `${s.name} × ${last.count}`;
    } else rows.push({ name: s.name, offset: s.offset, size: s.size, meta, count: 1 });
  }
  return rows;
}

export function InspectTool() {
  const entry = useActiveFile();
  const notices = useFiles((s) => s.notices);
  const dismiss = useFiles((s) => s.dismissNotice);
  const onFiles = useCallback((f: File[]) => void activateAndAdd(f), []);
  const [q, setQ] = useState("");

  const a = entry?.analysis;
  const groups = useMemo(() => {
    if (!a) return [];
    const query = q.trim().toLowerCase();
    if (!query) return a.report.groups;
    return a.report.groups
      .map((g) =>
        g.title.toLowerCase().includes(query)
          ? g
          : { ...g, fields: g.fields.filter((f) => f.key.toLowerCase().includes(query) || f.value.toLowerCase().includes(query)) },
      )
      .filter((g) => g.fields.length);
  }, [a, q]);
  const fieldCount = groups.reduce((n, g) => n + g.fields.length, 0);
  const willRemove = useMemo(() => new Set(a?.scan.blocks.map((b) => b.id) ?? []), [a]);
  const metaBytes = a?.scan.blocks.reduce((s, b) => s + b.size, 0) ?? 0;

  if (!entry) {
    return (
      <>
        <PageHeader tool="inspect" />
        <Dropzone key="hero" onFiles={onFiles} title="Drop an image to inspect" multiple={false} hint="JPEG · PNG · WebP · up to 50 MB · nothing is changed" />
        <QueueNotices notices={notices} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <>
      <PageHeader tool="inspect" />
      <FileBar entry={entry} label="File being inspected">
        {a && <ExportMenu entry={entry} />}
        <Link href="/clean/" className={buttonVariants({ variant: "primary", className: "px-[18px]" })}>
          Clean this file
        </Link>
      </FileBar>
      <Dropzone onFiles={onFiles} variant="compact" compactTitle="Inspect another image, or paste one" multiple={false} />
      <QueueNotices notices={notices} onDismiss={dismiss} />

      {entry.status === "error" && <Notice tone="error">{entry.error}</Notice>}
      {(entry.status === "queued" || entry.status === "scanning") && <ReadingCard />}

      {a && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inspect-search" className="text-[13px] font-semibold text-ink-2">
              Search fields
            </label>
            <input
              id="inspect-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="GPS, Software, Copyright"
              className={inputClass}
            />
          </div>

          <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
            <section aria-label="Fields" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-4 pb-2 pt-[18px] sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[17px] font-semibold">Fields</h2>
                <div className="text-[13px] text-ink-3">
                  {pluralize(fieldCount, "field")} in {pluralize(groups.length, "group")}
                </div>
              </div>
              {groups.length === 0 && (
                <p className="m-0 pb-3 text-sm text-ink-2">
                  {q ? "No fields match your search." : "This file has no metadata fields. Only image data and rendering information."}
                </p>
              )}
              {groups.map((g) => (
                <Group key={g.id} g={g}>
                  {g.kind === "gps" && a.report.gps && <LocationPreview gps={a.report.gps} entry={entry} />}
                </Group>
              ))}
              {!groups.some((g) => g.kind === "gps") && a.report.gps && !q && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-2">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-tag" aria-hidden="true" />
                    <h3 className="m-0 text-sm font-semibold">Location</h3>
                    <span className="inline-flex h-6 items-center gap-[5px] rounded-full bg-tag-tint px-[9px] text-xs font-semibold text-tag-deep">
                      <PinIcon size={13} />
                      This photo contains a location
                    </span>
                  </div>
                  <LocationPreview gps={a.report.gps} entry={entry} />
                </div>
              )}
            </section>

            <section aria-label="Structure" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-4 pb-2 pt-[18px] sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[17px] font-semibold">Structure</h2>
                <div className="text-[13px] text-ink-3">{pluralize(a.scan.segments.length, "block")}, in file order</div>
              </div>
              <AnatomyStrip segments={a.scan.segments} willRemove={willRemove} height={14} />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-mono text-[12.5px]">
                  <thead>
                    <tr className="font-sans text-[13px] text-ink-2">
                      <th scope="col" className="pb-2 font-semibold">
                        Block
                      </th>
                      <th scope="col" className="pb-2 font-semibold">
                        Offset
                      </th>
                      <th scope="col" className="pb-2 text-right font-semibold">
                        Size
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {structureRows(a.scan.segments).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-[9px] pr-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", r.meta ? "bg-tag" : "bg-kept")} aria-hidden="true" />
                            <span className={cn("[overflow-wrap:anywhere]", r.meta && "font-semibold text-tag-deep")}>{r.name}</span>
                          </div>
                        </td>
                        <td className="py-[9px] pr-3 text-ink-2 max-sm:text-xs">{formatOffset(r.offset)}</td>
                        <td className="whitespace-nowrap py-[9px] text-right tabular">{formatBytes(r.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-x-[18px] gap-y-2 border-t border-line py-3 text-[13px] text-ink-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-3.5 rounded-[3px] bg-tag" aria-hidden="true" />
                  {a.scan.blocks.length ? `Metadata, ${formatBytes(metaBytes)} in ${pluralize(a.scan.blocks.length, "block")}` : "No metadata"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-3.5 rounded-[3px] bg-kept" aria-hidden="true" />
                  Image data and rendering
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
