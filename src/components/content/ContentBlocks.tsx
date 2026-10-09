import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Faq } from "@/lib/seo";
import { toolById, type ToolId } from "@/lib/tools";
import type { GuideMeta } from "@/content/guides/meta";
import { ArrowRightIcon } from "@/components/icons";

export function SectionHeading({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cn("font-display m-0 text-[24px] font-bold leading-[30px] sm:text-[28px] sm:leading-[34px]", className)}>
      {children}
    </h2>
  );
}

export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-fg" aria-hidden="true">
            {i + 1}
          </span>
          <h3 className="m-0 text-base font-semibold">{s.title}</h3>
          <p className="m-0 text-sm leading-[1.55] text-ink-2">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden" open>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
            <h3 className="m-0 text-base font-semibold leading-[1.4]">{f.q}</h3>
            <span className="mt-0.5 shrink-0 text-ink-3 transition-transform group-open:rotate-45" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <p className="m-0 mt-2 max-w-[760px] text-[15px] leading-[1.6] text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function ToolCards({ ids, className }: { ids: ToolId[]; className?: string }) {
  return (
    <div className={cn("grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]", className)}>
      {ids.map((id) => {
        const t = toolById(id);
        const Icon = t.icon;
        return (
          <Link
            key={id}
            href={t.href}
            className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 text-ink no-underline transition-colors hover:border-line-strong hover:text-ink"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink">
                <Icon size={18} />
              </span>
              <span className="min-w-0 text-base font-semibold leading-[1.3]">{t.label}</span>
              {t.lossy ? (
                <span className="ml-auto shrink-0 whitespace-nowrap rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-semibold text-ink-3">
                  Re-encodes
                </span>
              ) : (
                <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-proof-tint px-2 py-0.5 text-[11px] font-semibold text-proof">Lossless</span>
              )}
            </div>
            <p className="m-0 text-sm leading-[1.5] text-ink-2">{t.blurb}</p>
            <span className="mt-auto flex items-center gap-1 pt-1 text-sm font-semibold text-proof group-hover:text-proof-hover">
              Open {t.label}
              <ArrowRightIcon size={15} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function GuideCards({ guides, className }: { guides: GuideMeta[]; className?: string }) {
  return (
    <div className={cn("grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]", className)}>
      {guides.map((g) => (
        <Link
          key={g.slug}
          href={`/guides/${g.slug}/`}
          className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 text-ink no-underline transition-colors hover:border-line-strong hover:text-ink"
        >
          <span className="font-mono text-[11px] tracking-[0.08em] text-tag-deep">{g.category.toUpperCase()}</span>
          <span className="text-base font-semibold leading-[1.35]">{g.title}</span>
          <span className="text-sm leading-[1.5] text-ink-2">{g.description}</span>
          <span className="mt-auto pt-1 text-[13px] text-ink-3">{g.minutes} min read</span>
        </Link>
      ))}
    </div>
  );
}
