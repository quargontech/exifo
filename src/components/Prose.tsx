import { cn } from "@/lib/cn";

/** Long-form text styling for the content pages. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex max-w-[760px] flex-col gap-4 text-[15px] leading-[1.65] text-ink",
        "[&_h2]:font-display [&_h2]:mt-6 [&_h2]:mb-0 [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:leading-[30px]",
        "[&_h3]:mt-2 [&_h3]:mb-0 [&_h3]:text-[17px] [&_h3]:font-semibold",
        "[&_p]:m-0 [&_p]:text-ink-2 [&_li]:text-ink-2 [&_strong]:text-ink",
        "[&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5",
        "[&_ol]:m-0 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5",
        "[&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-5", className)}>{children}</div>;
}
