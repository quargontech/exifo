"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TOOLS } from "@/lib/tools";
import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works/", label: "How it works" },
  { href: "/guides/", label: "Guides" },
  { href: "/faq/", label: "FAQ" },
];

function ToolsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {(["metadata", "image"] as const).map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <div className="px-2.5 pb-1 font-mono text-xs tracking-[0.08em] text-ink-3">{group === "metadata" ? "METADATA" : "IMAGE"}</div>
          {TOOLS.filter((t) => t.group === group).map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={t.href}
                onClick={onNavigate}
                aria-current={pathname?.startsWith(t.href) ? "page" : undefined}
                className={cn(
                  "flex gap-3 rounded-[10px] px-2.5 py-2 text-ink no-underline hover:bg-surface-2 hover:text-ink",
                  pathname?.startsWith(t.href) && "bg-surface-2",
                )}
              >
                <Icon size={18} className="mt-0.5 shrink-0 text-ink-2" />
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{t.label}</span>
                  <span className="text-[13px] leading-[1.4] text-ink-3">{t.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function NavLink({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "flex h-10 items-center rounded-[10px] px-3 text-[15px] font-medium no-underline hover:bg-surface-2 hover:text-ink",
        on ? "bg-surface-2 text-ink" : "text-ink-2",
      )}
    >
      {label}
    </Link>
  );
}

const isActive = (pathname: string | null, href: string) => (href === "/" ? pathname === "/" : !!pathname?.startsWith(href));

/** `app` spans the full width above the tool sidebar; `site` is centred on content pages. */
export function SiteHeader({ variant = "site" }: { variant?: "site" | "app" }) {
  const pathname = usePathname();
  const onTool = TOOLS.some((t) => pathname?.startsWith(t.href));
  const [tools, setTools] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Move focus into the menu panel when it opens, so keyboard and screen-reader users land in it.
  useEffect(() => {
    if (drawer) drawerRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [drawer]);

  useEffect(() => {
    setTools(false);
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!tools && !drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTools(false);
        setDrawer(false);
      }
    };
    const onDoc = (e: MouseEvent) => {
      if (tools && !toolsRef.current?.contains(e.target as Node)) setTools(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    if (drawer) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
      document.body.style.overflow = "";
    };
  }, [tools, drawer]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ground/85 backdrop-blur supports-[backdrop-filter]:bg-ground/75">
        <div className={cn("mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6", variant === "site" ? "max-w-[1200px]" : "lg:pl-6 lg:pr-5")}>
          <Link href="/" aria-label="Exifo home" className="shrink-0">
            <Logo height={26} />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink {...LINKS[0]} on={isActive(pathname, "/")} />
            <div ref={toolsRef} className="relative">
              <button
                type="button"
                aria-expanded={tools}
                aria-controls="tools-panel"
                onClick={() => setTools(!tools)}
                className={cn(
                  "flex h-10 items-center gap-1 rounded-[10px] px-3 text-[15px] font-medium hover:bg-surface-2 hover:text-ink",
                  onTool || tools ? "bg-surface-2 text-ink" : "text-ink-2",
                )}
              >
                Tools
                <ChevronDownIcon size={16} className={cn("transition-transform", tools && "rotate-180")} />
              </button>
              {tools && (
                <div
                  id="tools-panel"
                  className="absolute left-1/2 top-[calc(100%+8px)] w-[640px] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-xl"
                >
                  <ToolsPanel onNavigate={() => setTools(false)} />
                </div>
              )}
            </div>
            {LINKS.slice(1).map((l) => (
              <NavLink key={l.href} {...l} on={isActive(pathname, l.href)} />
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {!pathname?.startsWith("/clean/") && (
              <Link
                href="/clean/"
                // cn() so "hidden" overrides the base inline-flex; very narrow phones need the room for the menu button.
                className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden px-4 no-underline hover:text-primary-fg min-[360px]:inline-flex")}
              >
                Clean images
              </Link>
            )}
            <button
              type="button"
              aria-label="Open the menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-ink hover:bg-surface-2 md:hidden"
            >
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Outside the header: its backdrop blur would make it the drawer's containing block. */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 h-full w-full bg-black/40" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} className="absolute inset-y-0 right-0 flex w-[min(360px,90vw)] flex-col gap-5 overflow-y-auto bg-surface px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between pl-2">
              <Logo height={24} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-ink-2 hover:bg-surface-2"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(pathname, l.href) ? "page" : undefined}
                  className={cn(
                    "rounded-[10px] px-2.5 py-2.5 text-base font-semibold text-ink no-underline hover:bg-surface-2",
                    isActive(pathname, l.href) && "bg-surface-2",
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <ToolsPanel onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}
