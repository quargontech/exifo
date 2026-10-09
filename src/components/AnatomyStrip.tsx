import { cn } from "@/lib/cn";
import type { Segment } from "@/lib/types";

type State = "kept" | "found" | "removed";

interface Bar {
  state: State;
  size: number;
  key: string;
}

/**
 * The file anatomy strip: every segment in file order. Grey = kept (image data
 * and anything that affects how it looks), orange = metadata that will be removed,
 * dashed orange = removed.
 */
export function AnatomyStrip({
  segments,
  willRemove,
  removed,
  height = 12,
  busy,
  className,
}: {
  segments: Segment[];
  /** Block ids that will be removed with the current options. */
  willRemove?: Set<string>;
  /** Block ids that were removed (after cleaning). */
  removed?: Set<string>;
  height?: number;
  /** The file is being written: blocks to remove blink in turn. */
  busy?: boolean;
  className?: string;
}) {
  const total = Math.max(
    1,
    segments.reduce((s, x) => s + x.size, 0),
  );
  const bars: Bar[] = [];
  for (const seg of segments) {
    let state: State = "kept";
    if (seg.blockId && removed?.has(seg.blockId)) state = "removed";
    else if (seg.blockId && willRemove?.has(seg.blockId)) state = "found";
    const last = bars[bars.length - 1];
    const sameGroup = last && last.state === state && (state === "kept" || last.key.endsWith(`|${seg.blockId}`));
    if (sameGroup) last.size += seg.size;
    else bars.push({ state, size: seg.size, key: `${bars.length}|${seg.blockId ?? ""}` });
  }
  const found = bars.filter((b) => b.state === "found").length;
  const gone = bars.filter((b) => b.state === "removed").length;
  const label =
    gone > 0
      ? `File blocks in order: ${gone} metadata ${gone === 1 ? "block" : "blocks"} removed`
      : found > 0
        ? `File blocks in order: ${found} metadata ${found === 1 ? "block" : "blocks"} to remove`
        : "File blocks in order: no metadata to remove";
  return (
    <div className={cn("flex gap-[3px]", className)} role="img" aria-label={label}>
      {bars.map((b, i) => {
        // Stagger by position among the metadata bars so the effect runs left to right.
        const nth = bars.slice(0, i).filter((x) => x.state !== "kept").length;
        return (
          <div
            key={b.key}
            className={cn(
              "box-border rounded-[3px]",
              b.state === "kept" && "bg-kept",
              b.state === "found" && "bg-tag",
              b.state === "found" && busy && "exifo-blink",
              b.state === "removed" && "exifo-peel border-[1.5px] border-dashed border-tag",
            )}
            style={{
              flex: `${Math.max(0.6, 30 * Math.sqrt(b.size / total)).toFixed(3)} 1 0`,
              height,
              animationDelay: b.state === "kept" ? undefined : `${nth * (b.state === "removed" ? 110 : 150)}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

export function StripLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-ink-2", className)}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-3.5 rounded-[3px] bg-kept" aria-hidden="true" />
        Kept: image data and anything that affects how it looks
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-3.5 rounded-[3px] bg-tag" aria-hidden="true" />
        Found: metadata that will be removed
      </div>
      <div className="flex items-center gap-2">
        <span className="box-border h-2.5 w-3.5 rounded-[3px] border-[1.5px] border-dashed border-tag" aria-hidden="true" />
        Removed
      </div>
    </div>
  );
}
