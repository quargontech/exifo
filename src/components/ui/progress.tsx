import { cn } from "@/lib/cn";

/** Small spinning ring, sized to sit inside a button or badge. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={cn("shrink-0 animate-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Thin progress bar. Without `value` it is indeterminate. */
export function ProgressBar({ value, max = 1, label, className }: { value?: number; max?: number; label: string; className?: string }) {
  const pct = value === undefined ? undefined : Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      {pct === undefined ? (
        <div className="exifo-slide absolute inset-y-0 left-0 w-2/5 rounded-full bg-proof" />
      ) : (
        <div className="exifo-sheen h-full rounded-full bg-proof transition-[width] duration-500 ease-out" style={{ width: `${Math.max(pct, 6)}%` }} />
      )}
    </div>
  );
}

/** Shimmering placeholder block. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("exifo-shimmer rounded-md", className)} style={style} aria-hidden="true" />;
}

/** Placeholder for the file anatomy strip while a file is read. */
export function SkeletonStrip({ height = 12, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden="true">
      {[3, 9, 2, 14, 5, 30].map((f, i) => (
        <Skeleton key={i} className="rounded-[3px]" style={{ flex: `${f} 1 0`, height, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

/** Placeholder card shown while a file is being read. */
export function ReadingCard({ label = "Reading the file…" }: { label?: string }) {
  return (
    <div className="exifo-enter flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6" role="status">
      <div className="flex items-center gap-2.5 text-sm text-ink-2">
        <Spinner className="text-proof" />
        {label}
      </div>
      <SkeletonStrip />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-[42%]" />
        <Skeleton className="h-3.5 w-[68%]" />
        <Skeleton className="h-3.5 w-[55%]" />
      </div>
    </div>
  );
}

/** Empty image preview; shimmers while the image is being decoded. */
export function PreviewPlaceholder({ decoding }: { decoding?: boolean }) {
  return (
    <div className={cn("flex aspect-video items-center justify-center gap-2 rounded-xl text-sm text-ink-3", decoding ? "exifo-shimmer" : "bg-surface-2")}>
      {decoding && <Spinner size={14} className="text-proof" />}
      {decoding ? "Decoding…" : "Preview appears here"}
    </div>
  );
}
