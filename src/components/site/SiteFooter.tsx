import Link from "next/link";
import { cn } from "@/lib/cn";
import { TAGLINE } from "@/lib/seo";
import { TOOLS } from "@/lib/tools";
import { GUIDES } from "@/content/guides/meta";
import { LockIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="m-0 font-mono text-[11px] font-normal tracking-[0.08em] text-ink-3">{title}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-2 no-underline hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Site-wide footer with links to every tool and guide. `inset` renders it inside the tool column. */
export function SiteFooter({ inset }: { inset?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className={cn("border-t border-line", inset ? "mt-8 pt-8" : "bg-surface")}>
      <div className={cn("mx-auto flex flex-col gap-10", inset ? "" : "max-w-[1200px] px-4 py-12 sm:px-6")}>
        <div className="grid gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]">
          <div className="flex flex-col gap-3">
            <Link href="/" aria-label="Exifo home" className="self-start">
              <Logo height={24} />
            </Link>
            <p className="m-0 max-w-[260px] text-sm leading-[1.5] text-ink-2">{TAGLINE}</p>
            <p className="m-0 flex items-center gap-2 text-[13px] text-ink-3">
              <LockIcon size={14} />
              Files never leave your device.
            </p>
          </div>
          <Col title="METADATA TOOLS" links={TOOLS.filter((t) => t.group === "metadata").map((t) => ({ href: t.href, label: t.label }))} />
          <Col title="IMAGE TOOLS" links={TOOLS.filter((t) => t.group === "image").map((t) => ({ href: t.href, label: t.label }))} />
          <Col title="GUIDES" links={GUIDES.slice(0, 6).map((g) => ({ href: `/guides/${g.slug}/`, label: g.short }))} />
          <Col
            title="EXIFO"
            links={[
              { href: "/how-it-works/", label: "How it works" },
              { href: "/guides/", label: "All guides" },
              { href: "/faq/", label: "FAQ" },
              { href: "/privacy/", label: "Privacy" },
              { href: "/terms/", label: "Terms of use" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-ink-3">
          <span>© {year} Exifo. Free image metadata tools that run in your browser.</span>
          <span>Exifo removes metadata only. It does not remove watermarks or make images undetectable.</span>
        </div>
      </div>
    </footer>
  );
}
