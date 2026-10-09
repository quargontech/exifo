"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { TOOLS, type Tool } from "@/lib/tools";
import { LockIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site/SiteHeader";

const normalize = (p: string) => (p.endsWith("/") ? p : `${p}/`);

function useActiveTool(): Tool | undefined {
  const path = normalize(usePathname() || "/");
  return TOOLS.find((t) => normalize(t.href) === path);
}

function NavGroup({ title, tools, active }: { title: string; tools: Tool[]; active?: Tool }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="px-2.5 pb-1 font-mono text-[11px] tracking-[0.08em] text-ink-3">{title}</div>
      {tools.map((t) => {
        const on = active?.id === t.id;
        const Icon = t.icon;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[15px] no-underline transition-colors",
              on ? "bg-surface-2 font-semibold text-ink hover:text-ink" : "font-medium text-ink-2 hover:bg-surface-2/60 hover:text-ink",
            )}
          >
            <Icon size={18} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="flex gap-2.5 rounded-xl bg-ground p-3 dark:bg-surface-2">
      <LockIcon size={18} className="mt-px shrink-0 text-ink" />
      <div className="flex flex-col gap-0.5">
        <div className="text-[13px] font-semibold leading-[1.35]">Files never leave your device</div>
        <div className="text-xs leading-[1.4] text-ink-3">Works offline after the first visit.</div>
      </div>
    </div>
  );
}

function NavBody({ active }: { active?: Tool }) {
  return (
    <>
      <NavGroup title="METADATA" tools={TOOLS.filter((t) => t.group === "metadata")} active={active} />
      <NavGroup title="IMAGE" tools={TOOLS.filter((t) => t.group === "image")} active={active} />
    </>
  );
}

function FooterLinks() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2.5 text-xs">
      {[
        ["/how-it-works/", "How it works"],
        ["/guides/", "Guides"],
        ["/faq/", "FAQ"],
        ["/privacy/", "Privacy"],
        ["/terms/", "Terms"],
      ].map(([href, label]) => (
        <Link key={href} href={href} className="text-ink-3 no-underline hover:text-ink">
          {label}
        </Link>
      ))}
    </div>
  );
}

function Sidebar({ active }: { active?: Tool }) {
  return (
    <nav
      aria-label="Tools"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[232px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex"
    >
      <NavBody active={active} />
      <div className="mt-auto flex flex-col gap-2.5">
        <PrivacyNote />
        <FooterLinks />
      </div>
    </nav>
  );
}

/** Below lg the sidebar becomes a row of pills under the site header. */
function ToolPills({ active }: { active?: Tool }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector('[aria-current="page"]');
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active?.id]);

  return (
    <nav aria-label="Tools" ref={ref} className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 lg:hidden">
      {TOOLS.map((t) => {
        const on = active?.id === t.id;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center rounded-full px-[18px] text-[15px] no-underline",
              on ? "bg-primary font-semibold text-primary-fg hover:text-primary-fg" : "border border-line bg-surface font-medium text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const active = useActiveTool();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader variant="app" />
      <div className="flex flex-1">
        <Sidebar active={active} />
        <div className="min-w-0 flex-1">
          <ToolPills active={active} />
          <main id="main" className="px-4 pb-28 pt-2 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9">
            <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5">{children}</div>
            {footer && <div className="mx-auto w-full max-w-[1040px]">{footer}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
