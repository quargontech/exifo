import { cn } from "@/lib/cn";
import { CloseIcon, ErrorIcon, InfoIcon, WarningIcon } from "@/components/icons";

export function Notice({
  tone,
  children,
  className,
  onDismiss,
}: {
  tone: "warning" | "info" | "error" | "quiet";
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  const Icon = tone === "warning" ? WarningIcon : tone === "error" ? ErrorIcon : InfoIcon;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] leading-[1.45] text-ink",
        tone === "warning" && "bg-tag-tint",
        tone === "info" && "bg-proof-tint",
        tone === "error" && "bg-danger-tint",
        tone === "quiet" && "bg-surface-2 text-ink-2",
        className,
      )}
    >
      <Icon
        size={18}
        className={cn(
          "mt-px shrink-0",
          tone === "warning" && "text-tag-deep",
          tone === "info" && "text-proof",
          tone === "error" && "text-danger",
          tone === "quiet" && "text-ink-3",
        )}
      />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-my-1.5 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
