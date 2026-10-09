/** Display formatting helpers shared by the UI and reports. */

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n < 1000) return `${n} B`;
  if (n < 1000 * 1000) return `${(n / 1000).toFixed(1)} KB`;
  if (n < 1000 * 1000 * 1000) return `${(n / 1000 / 1000).toFixed(2)} MB`;
  return `${(n / 1e9).toFixed(2)} GB`;
}

export const formatOffset = (n: number) => `0x${n.toString(16).toUpperCase().padStart(6, "0")}`;

export const formatDims = (w: number, h: number) => (w && h ? `${w} × ${h}` : "");

export const ORIENTATION_TEXT: Record<number, string> = {
  1: "normal",
  2: "mirrored",
  3: "rotate 180°",
  4: "mirrored, rotate 180°",
  5: "mirrored, rotate 90° CW",
  6: "rotate 90° CW",
  7: "mirrored, rotate 270° CW",
  8: "rotate 270° CW",
};

export function formatCoordinate(v: number, isLat: boolean): string {
  const hemi = isLat ? (v >= 0 ? "N" : "S") : v >= 0 ? "E" : "W";
  return `${Math.abs(v).toFixed(4)}° ${hemi}`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()} …` : s;
}

/** "a, b and c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
