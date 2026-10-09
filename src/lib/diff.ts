/** Compare the metadata of two files. */

import { formatBytes } from "./format";
import type { Analysis } from "./report";

export type DiffStatus = "only-a" | "only-b" | "different" | "same";

export interface FieldDiff {
  group: string;
  key: string;
  a?: string;
  b?: string;
  status: DiffStatus;
}

export interface BlockDiff {
  label: string;
  a?: string;
  b?: string;
  status: DiffStatus;
}

function fieldMap(x: Analysis): Map<string, { group: string; key: string; value: string }> {
  const m = new Map<string, { group: string; key: string; value: string }>();
  for (const g of x.report.groups) {
    const seen = new Map<string, number>();
    for (const f of g.fields) {
      const n = (seen.get(f.key) ?? 0) + 1;
      seen.set(f.key, n);
      const id = `${g.title}\u0000${f.key}\u0000${n}`;
      m.set(id, { group: g.title, key: n > 1 ? `${f.key} (${n})` : f.key, value: f.value });
    }
  }
  return m;
}

export function diffFields(a: Analysis, b: Analysis): FieldDiff[] {
  const ma = fieldMap(a);
  const mb = fieldMap(b);
  const out: FieldDiff[] = [];
  for (const [id, x] of ma) {
    const y = mb.get(id);
    if (!y) out.push({ group: x.group, key: x.key, a: x.value, status: "only-a" });
    else out.push({ group: x.group, key: x.key, a: x.value, b: y.value, status: x.value === y.value ? "same" : "different" });
  }
  for (const [id, y] of mb) if (!ma.has(id)) out.push({ group: y.group, key: y.key, b: y.value, status: "only-b" });
  const order: Record<DiffStatus, number> = { different: 0, "only-a": 1, "only-b": 2, same: 3 };
  return out.sort((p, q) => order[p.status] - order[q.status]);
}

export function diffBlocks(a: Analysis, b: Analysis): BlockDiff[] {
  const sig = (x: Analysis) => {
    const m = new Map<string, number>();
    for (const blk of x.scan.blocks) m.set(blk.label, (m.get(blk.label) ?? 0) + blk.size);
    if (x.scan.hasIcc) m.set("Colour profile (kept)", -1);
    return m;
  };
  const sa = sig(a);
  const sb = sig(b);
  const labels = [...new Set([...sa.keys(), ...sb.keys()])];
  const fmt = (n?: number) => (n === undefined ? undefined : n < 0 ? "present" : formatBytes(n));
  return labels.map((label) => {
    const x = sa.get(label);
    const y = sb.get(label);
    const status: DiffStatus = x === undefined ? "only-b" : y === undefined ? "only-a" : x === y ? "same" : "different";
    return { label, a: fmt(x), b: fmt(y), status };
  });
}
