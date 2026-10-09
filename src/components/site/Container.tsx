import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "header";
}) {
  return <As className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6", className)}>{children}</As>;
}

/** Header for site pages (guides, FAQ, legal). */
export function PageIntro({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex max-w-[820px] flex-col gap-3">
      {eyebrow && <div className="font-mono text-[11px] tracking-[0.08em] text-tag-deep">{eyebrow.toUpperCase()}</div>}
      <h1 className="font-display m-0 text-[34px] font-bold leading-[40px] sm:text-[44px] sm:leading-[50px]">{title}</h1>
      {lead && <p className="m-0 text-[17px] leading-[1.55] text-ink-2">{lead}</p>}
      {children}
    </header>
  );
}
