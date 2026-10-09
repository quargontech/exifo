/** Export metadata reports as JSON, CSV or plain text. */

import { formatBytes } from "./format";
import { verdictFor } from "./provenance";
import type { Analysis } from "./report";

export interface ExportItem {
  name: string;
  size: number;
  analysis: Analysis;
}

export type ExportFormat = "json" | "csv" | "txt";

function fileJson(item: ExportItem) {
  const { scan, report } = item.analysis;
  return {
    file: {
      name: item.name,
      sizeBytes: item.size,
      format: scan.format,
      width: scan.width,
      height: scan.height,
      orientation: scan.orientation,
      colourProfile: scan.hasIcc,
      animated: scan.isAnimated,
    },
    provenance: {
      verdict: verdictFor(report).title,
      aiSignals: report.aiSignals,
      digitalSourceType: report.digitalSourceType ?? null,
      contentCredentials: report.c2pa
        ? {
            claimGenerator: report.c2pa.claimGenerator ?? null,
            signer: report.c2pa.signer ?? null,
            signedAt: report.c2pa.signedAt ?? null,
            actions: report.c2pa.actions.map((a) => a.action),
            note: "Signature not validated in this export.",
          }
        : null,
      prompts: report.prompts,
    },
    location: report.gps ?? null,
    blocks: scan.blocks.map((b) => ({ kind: b.kind, label: b.label, container: b.container, offset: b.offset, sizeBytes: b.size, aiSignals: b.aiSignals })),
    fields: report.groups.map((g) => ({
      group: g.title,
      source: g.source,
      removable: g.removable,
      values: g.fields.map((f) => ({ key: f.key, value: f.value })),
    })),
    structure: scan.segments.map((s) => ({ name: s.name, offset: s.offset, sizeBytes: s.size, role: s.role })),
  };
}

const CSV_COLUMNS = [
  "file",
  "format",
  "width",
  "height",
  "size_bytes",
  "orientation",
  "make",
  "model",
  "software",
  "date_taken",
  "gps_latitude",
  "gps_longitude",
  "creator",
  "copyright",
  "ai_flag",
  "verdict",
  "ai_signals",
  "digital_source_type",
  "c2pa",
  "c2pa_generator",
  "c2pa_signer",
  "metadata_blocks",
  "metadata_bytes",
] as const;

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fieldValue(a: Analysis, group: string, key: string) {
  return a.report.groups.find((g) => g.id === group)?.fields.find((f) => f.key === key)?.value;
}

function csvRow(item: ExportItem): string {
  const a = item.analysis;
  const r = a.report;
  const row: Record<(typeof CSV_COLUMNS)[number], unknown> = {
    file: item.name,
    format: a.scan.format,
    width: a.scan.width,
    height: a.scan.height,
    size_bytes: item.size,
    orientation: a.scan.orientation,
    make: fieldValue(a, "exif", "Make"),
    model: fieldValue(a, "exif", "Model"),
    software: r.tool,
    date_taken: r.descriptive.dateCreated,
    gps_latitude: r.gps?.lat.toFixed(6),
    gps_longitude: r.gps?.lon.toFixed(6),
    creator: r.descriptive.creator?.join("; "),
    copyright: r.descriptive.copyright,
    ai_flag: r.aiFlag ?? "",
    verdict: verdictFor(r).title,
    ai_signals: r.aiSignals.join("; "),
    digital_source_type: r.digitalSourceType,
    c2pa: r.c2pa ? "yes" : "no",
    c2pa_generator: r.c2pa?.claimGenerator,
    c2pa_signer: r.c2pa?.signer,
    metadata_blocks: a.scan.blocks.map((b) => b.short).join("; "),
    metadata_bytes: a.scan.blocks.reduce((s, b) => s + b.size, 0),
  };
  return CSV_COLUMNS.map((c) => csvCell(row[c])).join(",");
}

function fileText(item: ExportItem): string {
  const { scan, report } = item.analysis;
  const lines: string[] = [];
  lines.push(`${item.name}`);
  lines.push(`${scan.format.toUpperCase()} · ${scan.width} × ${scan.height} · ${formatBytes(item.size)}`);
  lines.push(`Verdict: ${verdictFor(report).title}`);
  if (report.aiSignals.length) lines.push(`AI and provenance signals: ${report.aiSignals.join("; ")}`);
  lines.push("");
  for (const g of report.groups) {
    lines.push(`[${g.title}] ${g.source}`);
    const w = Math.min(28, Math.max(...g.fields.map((f) => f.key.length), 4));
    for (const f of g.fields) lines.push(`  ${f.key.padEnd(w)}  ${f.value.replace(/\s*\n\s*/g, " ")}`);
    lines.push("");
  }
  lines.push("Structure");
  for (const s of scan.segments) lines.push(`  ${s.name.padEnd(28)} 0x${s.offset.toString(16).toUpperCase().padStart(6, "0")}  ${formatBytes(s.size)}`);
  return lines.join("\n");
}

export function exportReport(items: ExportItem[], format: ExportFormat): { text: string; mime: string; ext: string } {
  if (format === "json") {
    const payload = {
      generator: "Exifo (exifo.app)",
      exportedAt: new Date().toISOString(),
      files: items.map(fileJson),
    };
    return { text: JSON.stringify(payload, null, 2), mime: "application/json", ext: "json" };
  }
  if (format === "csv") {
    return { text: [CSV_COLUMNS.join(","), ...items.map(csvRow)].join("\r\n") + "\r\n", mime: "text/csv", ext: "csv" };
  }
  const header = `Exifo metadata report · ${new Date().toISOString()}\n${"=".repeat(60)}\n\n`;
  return { text: header + items.map(fileText).join(`\n\n${"-".repeat(60)}\n\n`) + "\n", mime: "text/plain", ext: "txt" };
}
