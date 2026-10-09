"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  hint?: string;
  onSelect: () => void;
}

/** Accessible dropdown menu: button + list of actions. Arrow keys move, Escape closes. */
export function Menu({
  trigger,
  items,
  align = "end",
  className,
}: {
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    "aria-controls": string;
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = list.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu", "aria-controls": id, ref: btn })}
      {open && (
        <div
          id={id}
          ref={list}
          role="menu"
          onKeyDown={onKey}
          className={cn(
            "absolute top-[calc(100%+6px)] z-30 flex min-w-[220px] flex-col rounded-xl border border-line bg-surface p-1.5 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className="flex flex-col items-start rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
            >
              {it.label}
              {it.hint && <span className="text-xs font-normal text-ink-3">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
