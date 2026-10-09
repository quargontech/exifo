import Link from "next/link";
import { cn } from "@/lib/cn";
import { toolById, type ToolId } from "@/lib/tools";
import { LosslessBadge, ReencodeBadge } from "@/components/ui/badges";

export function PageHeader({
  tool,
  title,
  subtitle,
  className,
  badge,
}: {
  tool?: ToolId;
  title?: string;
  subtitle?: string;
  className?: string;
  badge?: "lossless" | "reencode" | null;
}) {
  const t = tool ? toolById(tool) : undefined;
  const b = badge === undefined ? (t?.lossy ? "reencode" : null) : badge;
  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-display m-0 text-[28px] font-bold leading-[34px] sm:text-[32px] sm:leading-[38px]">{title ?? t?.title}</h1>
        {b === "reencode" && <ReencodeBadge />}
        {b === "lossless" && <LosslessBadge />}
      </div>
      <p className="m-0 text-ink-2">{subtitle ?? t?.subtitle}</p>
    </header>
  );
}

export function LegalNote({ full }: { full?: boolean }) {
  return (
    <p className="m-0 text-[13px] leading-[1.55] text-ink-3">
      Exifo removes metadata only. It does not remove visible or invisible watermarks, and a cleaned file is not undetectable.
      {full && " You are responsible for following platform rules and local law on disclosing AI-generated content."}{" "}
      <Link href="/terms/" className="font-semibold">
        Read the terms
      </Link>
    </p>
  );
}
