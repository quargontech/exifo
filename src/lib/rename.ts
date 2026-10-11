/** Batch rename by pattern. File contents are never touched. */

export interface RenameInput {
  name: string;
  lastModified: number;
  width?: number;
  height?: number;
  /** EXIF date taken, "YYYY:MM:DD HH:MM:SS" or ISO. */
  dateTaken?: string;
  make?: string;
  model?: string;
}

export interface RenameSettings {
  pattern: string;
  start: number;
  pad: number;
  /** Lower-case the extension. */
  lowerExt: boolean;
}

export const DEFAULT_RENAME: RenameSettings = { pattern: "{date}_{n}", start: 1, pad: 3, lowerExt: true };

export const RENAME_TOKENS: { token: string; label: string }[] = [
  { token: "{name}", label: "Original name" },
  { token: "{n}", label: "Counter" },
  { token: "{date}", label: "Date taken" },
  { token: "{time}", label: "Time taken" },
  { token: "{make}", label: "Camera make" },
  { token: "{model}", label: "Camera model" },
  { token: "{width}", label: "Width" },
  { token: "{height}", label: "Height" },
];

export function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
}

function dateParts(input: RenameInput): { date: string; time: string } {
  const m = input.dateTaken && /^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(input.dateTaken);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}-${m[5]}-${m[6]}` : "00-00-00" };
  const d = new Date(input.lastModified);
  const pad = (x: number) => String(x).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`,
  };
}

/** Make a string safe as a file name (no path or reserved characters, no leading or trailing dots and spaces). */
export const sanitizeFileName = (s: string) =>
  s
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[.\s]+$/, "");

export function renameOne(input: RenameInput, index: number, s: RenameSettings): string {
  const [base, ext] = splitExt(input.name);
  const { date, time } = dateParts(input);
  const values: Record<string, string> = {
    name: base,
    n: String(s.start + index).padStart(Math.max(0, s.pad), "0"),
    date,
    time,
    make: input.make?.trim() || "unknown",
    model: input.model?.trim() || "unknown",
    width: input.width ? String(input.width) : "0",
    height: input.height ? String(input.height) : "0",
  };
  const out = sanitizeFileName(s.pattern.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m)) || base;
  return out + (s.lowerExt ? ext.toLowerCase() : ext);
}

export interface RenamePreview {
  from: string;
  to: string;
  duplicate: boolean;
}

export function previewRename(inputs: RenameInput[], s: RenameSettings): RenamePreview[] {
  const names = inputs.map((x, i) => renameOne(x, i, s));
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n.toLowerCase(), (counts.get(n.toLowerCase()) ?? 0) + 1);
  return inputs.map((x, i) => ({ from: x.name, to: names[i], duplicate: (counts.get(names[i].toLowerCase()) ?? 0) > 1 }));
}

/** Make names unique by adding " (2)", " (3)" … before the extension. */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((n) => {
    const [base, ext] = splitExt(n);
    let candidate = n;
    let i = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${base} (${i++})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
