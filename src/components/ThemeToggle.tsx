"use client";

import { cn } from "@/lib/cn";
import { setTheme, useTheme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "@/components/icons";

// Both icons are rendered; CSS on [data-theme] picks one, so the first paint is right
// before hydration and the swap animates without a flash on load.
const icon = "absolute transition-[rotate,scale,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useTheme() === "dark";
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTheme(dark ? "light" : "dark", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn("relative flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 hover:bg-surface-2 hover:text-ink", className)}
    >
      <SunIcon className={cn(icon, "rotate-[-90deg] scale-50 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100")} />
      <MoonIcon className={cn(icon, "rotate-0 scale-100 opacity-100 dark:rotate-90 dark:scale-50 dark:opacity-0")} />
    </button>
  );
}
