"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Comlink from "comlink";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { FORMAT_LABEL } from "@/lib/detect";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatDims, pluralize } from "@/lib/format";
import { buildPdf, rotationFor, type PageOrientation, type PageSize, type PdfImage } from "@/lib/pdf";
import { probe } from "@/lib/probe";
import { ALL_BLOCK_KINDS } from "@/lib/types";
import { imageWorker } from "@/lib/image-worker";
import { stripWorker } from "@/lib/workers";
import { ImageToolFrame } from "@/components/images/ImageToolFrame";
import { FileThumb } from "@/components/FileThumb";
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, GripIcon, PdfIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, inputClass, Segmented, selectClass, Switch } from "@/components/ui/controls";
import { Notice } from "@/components/ui/notice";
import { ProgressBar } from "@/components/ui/progress";
import { errorMessage } from "@/store/files";
import { sourceFor, useImages, type ImageEntry } from "@/store/images";

function Row({ f, index, total, move, busy }: { f: ImageEntry; index: number; total: number; move: (from: number, to: number) => void; busy?: boolean }) {
  const remove = useImages((s) => s.remove);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 bg-surface px-2 py-2.5 sm:px-3", isDragging && "relative z-10 rounded-xl shadow-lg ring-1 ring-line")}
    >
      <button
        type="button"
        className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 active:cursor-grabbing"
        aria-label={`Reorder ${f.name}`}
        {...attributes}
        {...listeners}
      >
        <GripIcon size={18} />
      </button>
      <span className="w-6 shrink-0 text-center font-mono text-xs text-ink-3">{index + 1}</span>
      <FileThumb url={f.url ?? undefined} size={44} busy={busy || f.status === "decoding"} tone="proof" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-mono text-[13px] font-semibold">{f.name}</span>
        <span className="font-mono text-xs text-ink-3">{[FORMAT_LABEL[f.format], formatDims(f.width, f.height), formatBytes(f.size)].join(" · ")}</span>
      </div>
      <Button variant="ghost" size="iconSm" aria-label={`Move ${f.name} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>
        <ChevronUpIcon size={16} />
      </Button>
      <Button variant="ghost" size="iconSm" aria-label={`Move ${f.name} down`} disabled={index === total - 1} onClick={() => move(index, index + 1)}>
        <ChevronDownIcon size={16} />
      </Button>
      <Button variant="ghost" size="iconSm" aria-label={`Remove ${f.name}`} onClick={() => remove(f.id)}>
        <CloseIcon size={16} />
      </Button>
    </li>
  );
}

async function prepare(f: ImageEntry, clean: boolean): Promise<PdfImage> {
  if (f.format === "jpeg") {
    let bytes = new Uint8Array(await f.file.arrayBuffer());
    const p = probe(bytes);
    const rotation = rotationFor(p?.orientation ?? 1);
    if (rotation !== null && p) {
      if (clean) {
        const buf = bytes.slice().buffer;
        const res = await stripWorker().call((api) => api.clean(Comlink.transfer(buf, [buf]), { remove: [...ALL_BLOCK_KINDS], keepOrientation: false }));
        bytes = new Uint8Array(res.output);
      }
      return { kind: "jpeg", bytes, width: p.width, height: p.height, rotation };
    }
  }
  if (f.format === "png" && f.orientation === 1) {
    let bytes = new Uint8Array(await f.file.arrayBuffer());
    if (clean) {
      const buf = bytes.slice().buffer;
      const res = await stripWorker().call((api) => api.clean(Comlink.transfer(buf, [buf]), { remove: [...ALL_BLOCK_KINDS], keepOrientation: false }));
      bytes = new Uint8Array(res.output);
    }
    return { kind: "png", bytes, width: f.width, height: f.height, rotation: 0 };
  }
  // WebP, AVIF, HEIC, GIF, BMP and mirrored orientations: lossless PNG with orientation applied.
  const src = await sourceFor(f);
  const r = await imageWorker().call((api) => api.toPng(Comlink.transfer(src.buffer, [src.buffer]), src.mime));
  return { kind: "png", bytes: new Uint8Array(r.output), width: r.width, height: r.height, rotation: 0 };
}

export function PdfTool() {
  const files = useImages((s) => s.files);
  const reorder = useImages((s) => s.reorder);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<PageOrientation>("auto");
  const [margin, setMargin] = useState(10);
  const [clean, setClean] = useState(true);
  const [name, setName] = useState("images.pdf");
  // `at` is the index of the image being prepared; files.length while the PDF itself is written.
  const [state, setState] = useState<{ busy?: boolean; step?: string; at?: number; done?: string; error?: string }>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = files.map((f) => f.id);
  const move = (from: number, to: number) => reorder(arrayMove(ids, from, to));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };

  const create = async () => {
    setState({ busy: true, step: "Preparing images…", at: 0 });
    try {
      const images: PdfImage[] = [];
      for (let i = 0; i < files.length; i++) {
        setState({ busy: true, step: `Preparing image ${i + 1} of ${files.length}…`, at: i });
        images.push(await prepare(files[i], clean));
      }
      setState({ busy: true, step: "Writing the PDF…", at: files.length });
      const title = name.replace(/\.pdf$/i, "").trim();
      const pdf = await buildPdf(images, { pageSize, orientation, margin, title: title || undefined });
      const fileName = `${title || "images"}.pdf`;
      downloadBlob(new Blob([pdf as BlobPart], { type: "application/pdf" }), fileName);
      setState({ done: `${fileName} · ${pluralize(images.length, "page")} · ${formatBytes(pdf.length)}` });
    } catch (err) {
      setState({ error: errorMessage(err) });
    }
  };

  const passthrough = files.filter((f) => f.format === "jpeg").length;

  return (
    <ImageToolFrame tool="pdf" emptyTitle="Drop images to combine into a PDF">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
        <section aria-label="Pages" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 sm:p-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <h2 className="m-0 text-[15px] font-semibold">Pages</h2>
            <span className="text-[13px] text-ink-3">Drag to reorder</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {files.map((f, i) => (
                  <Row key={f.id} f={f} index={i} total={files.length} move={move} busy={state.busy && state.at === i} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>

        <section aria-label="Settings" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <Field label="Page size">
            <Segmented
              label="Page size"
              stretch
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
                { value: "fit", label: "Fit to image" },
              ]}
            />
          </Field>
          {pageSize !== "fit" && (
            <Field label="Orientation">
              <Segmented
                label="Orientation"
                stretch
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            </Field>
          )}
          <Field label="Margins" htmlFor="pdf-margin">
            <select id="pdf-margin" className={selectClass} value={margin} onChange={(e) => setMargin(Number(e.target.value))}>
              <option value={0}>None</option>
              <option value={10}>Small (10 mm)</option>
              <option value={20}>Medium (20 mm)</option>
              <option value={30}>Large (30 mm)</option>
            </select>
          </Field>
          <Switch
            checked={clean}
            onChange={setClean}
            label="Remove metadata from each image"
            description="EXIF, GPS and other blocks are not embedded in the PDF."
          />
          <Field label="File name" htmlFor="pdf-name">
            <input id="pdf-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button variant="primary" size="lg" disabled={!files.length || state.busy} loading={state.busy} onClick={create}>
            {!state.busy && <PdfIcon size={18} />}
            {state.busy ? state.step : `Create PDF · ${pluralize(files.length, "page")}`}
          </Button>
          {state.busy && <ProgressBar label="PDF progress" value={state.at ?? 0} max={files.length + 1} />}
          {state.done && <Notice tone="info">Downloaded {state.done}</Notice>}
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <p className="m-0 text-[13px] leading-[1.5] text-ink-3">
            {passthrough
              ? `${pluralize(passthrough, "JPEG")} ${passthrough === 1 ? "is" : "are"} embedded as ${passthrough === 1 ? "it is" : "they are"}, with no re-encoding. `
              : ""}
            PNG is embedded losslessly; other formats are converted to PNG first.
          </p>
        </section>
      </div>
    </ImageToolFrame>
  );
}
