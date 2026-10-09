import { cn } from "@/lib/cn";
import { InfoIcon, PinIcon, TickIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/progress";

export type Status = "queued" | "scanning" | "ready" | "cleaning" | "processing" | "done" | "error" | "empty";

const STATUS_LABEL: Record<Status, string> = {
  queued: "Queued",
  scanning: "Scanning",
  ready: "Ready",
  cleaning: "Cleaning",
  processing: "Working",
  done: "Cleaned",
  error: "Error",
  empty: "Nothing to remove",
};

/** File status pill. */
export function StatusBadge({ status, label, className }: { status: Status; label?: string; className?: string }) {
  const busy = status === "scanning" || status === "cleaning" || status === "processing";
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium",
        status === "queued" && "bg-surface-2 text-ink-2",
        busy && "bg-surface-2 text-ink-2",
        status === "ready" && "border border-line-strong bg-surface text-ink dark:bg-transparent",
        status === "done" && "bg-proof-tint text-proof",
        status === "error" && "bg-danger-tint text-danger",
        status === "empty" && "bg-surface-2 text-ink-2",
        className,
      )}
    >
      {busy && <Spinner size={12} className="text-proof" />}
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/** Rounded signal badge: orange for "found", blue for "proven". */
export function SignalBadge({
  tone,
  icon,
  children,
  className,
  size = "md",
}: {
  tone: "tag" | "proof" | "neutral" | "danger";
  icon?: "info" | "pin" | "tick" | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const ic =
    icon === "info" ? (
      <InfoIcon size={size === "sm" ? 13 : 15} />
    ) : icon === "pin" ? (
      <PinIcon size={size === "sm" ? 13 : 15} />
    ) : icon === "tick" ? (
      <TickIcon size={size === "sm" ? 13 : 15} />
    ) : (
      icon
    );
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        size === "sm" ? "h-6 gap-[5px] px-[9px] text-xs" : "h-7 gap-1.5 px-2.5 text-[13px]",
        tone === "tag" && "bg-tag-tint text-tag-deep",
        tone === "proof" && "bg-proof-tint text-proof",
        tone === "neutral" && "bg-surface-2 text-ink-2",
        tone === "danger" && "bg-danger-tint text-danger",
        className,
      )}
    >
      {ic}
      <span>{children}</span>
    </span>
  );
}

/** Block chip, e.g. "EXIF 21.4 KB". Found = orange; kept = neutral. */
export function BlockChip({ kept, children, removed }: { kept?: boolean; removed?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-[7px] rounded-[7px] border px-2.5 font-mono text-xs font-medium",
        kept ? "border-line bg-surface-2 text-ink-2" : "border-tag-line bg-tag-tint text-tag-deep",
        removed && "line-through decoration-1",
      )}
    >
      <span className={cn("h-2 w-2 rounded-[2px]", kept ? "bg-kept" : "bg-tag")} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** "Re-encodes image" badge for lossy tools. */
export function ReencodeBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong px-2.5 text-[13px] font-semibold text-ink-2">
      Re-encodes image
    </span>
  );
}

export function LosslessBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-proof-tint px-2.5 text-[13px] font-semibold text-proof">
      <TickIcon size={14} />
      Lossless
    </span>
  );
}
