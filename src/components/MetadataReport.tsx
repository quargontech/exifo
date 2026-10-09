import Link from "next/link";
import { cn } from "@/lib/cn";
import type { FieldGroup, Report } from "@/lib/report";
import { truncate } from "@/lib/format";

const SHORT: Record<string, string> = {
  exif: "EXIF",
  gps: "GPS",
  xmp: "XMP",
  iptc: "IPTC",
  text: "Text",
  c2pa: "C2PA",
  comment: "Comment",
  icc: "ICC",
  thumbnail: "Thumbnail",
  mpf: "MPF",
  trailer: "Trailer",
  unknown: "Other",
};

const KEY_FIELDS = new Set([
  "Make",
  "Model",
  "Software",
  "DateTimeOriginal",
  "Artist",
  "Copyright",
  "LensModel",
  "CreatorTool",
  "Claim generator",
  "Signature",
  "Creator",
  "Rights",
  "Credit",
  "Source",
  "By-line",
  "CopyrightNotice",
  "Comment",
]);

interface Row {
  block: string;
  key: string;
  value: string;
  ai?: boolean;
  rank: number;
}

export function reportRows(report: Report, includeKept = false): Row[] {
  const rows: Row[] = [];
  const groups = report.groups.filter((g) => includeKept || g.removable);
  for (const g of groups) {
    for (const f of g.fields) {
      const rank = f.ai ? 0 : g.kind === "gps" ? 1 : g.kind === "c2pa" ? 1 : KEY_FIELDS.has(f.key) ? 2 : 3;
      rows.push({ block: `${SHORT[g.kind] ?? g.title} · ${g.container}`, key: f.key, value: f.value, ai: f.ai, rank });
    }
  }
  return rows;
}

/** Block / Field / Value table for a file card. Shows the most relevant rows first. */
export function MetadataReport({ report, limit = 14, inspectHref }: { report: Report; limit?: number; inspectHref?: string }) {
  const all = reportRows(report);
  const rows = [...all].sort((a, b) => a.rank - b.rank).slice(0, limit);
  if (!rows.length) return <p className="m-0 text-[13px] text-ink-3">No readable fields.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-ground dark:bg-surface-2">
              <th scope="col" className="px-3.5 py-2.5 font-semibold text-ink-2">
                Block
              </th>
              <th scope="col" className="px-3.5 py-2.5 font-semibold text-ink-2">
                Field
              </th>
              <th scope="col" className="px-3.5 py-2.5 font-semibold text-ink-2">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-2">{r.block}</td>
                <td className="whitespace-nowrap px-3.5 py-2.5">{r.key}</td>
                <td className={cn("px-3.5 py-2.5 [overflow-wrap:anywhere]", r.ai && "font-semibold text-tag-deep")}>{truncate(r.value, 220)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {all.length > rows.length && inspectHref && (
        <p className="m-0 text-[13px] text-ink-3">
          Showing {rows.length} of {all.length} fields.{" "}
          <Link href={inspectHref} className="font-semibold">
            See all in Inspect
          </Link>
        </p>
      )}
    </div>
  );
}

export const groupShortName = (g: FieldGroup) => SHORT[g.kind] ?? g.title;
