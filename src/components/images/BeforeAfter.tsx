"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/progress";

/** Before/after comparison: drag (or use the arrow keys on) the divider. */
export function BeforeAfter({
  before,
  after,
  beforeLabel = "Original",
  afterLabel = "Result",
  ratio,
  busy,
  busyLabel = "Encoding…",
}: {
  before: string;
  after: string | null;
  beforeLabel?: string;
  afterLabel?: string;
  ratio: number;
  /** A new result is being made: sweep a scan line over the image. */
  busy?: boolean;
  busyLabel?: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px]",
        busy && "exifo-scan exifo-scan-proof",
      )}
      style={{ aspectRatio: String(ratio || 1) }}
    >
      <img src={after ?? before} alt={afterLabel} className="absolute inset-0 h-full w-full object-contain" />
      {after && (
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={before} alt={beforeLabel} className="absolute inset-0 h-full w-full object-contain" />
        </div>
      )}
      {after && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0F1218] shadow-md">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
              </svg>
            </div>
          </div>
          <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{beforeLabel}</span>
          <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{afterLabel}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Compare original and result"
            className="ba-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </>
      )}
      {busy && (
        <span className="exifo-enter pointer-events-none absolute bottom-2.5 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
          <Spinner size={13} />
          {busyLabel}
        </span>
      )}
    </div>
  );
}
