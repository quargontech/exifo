"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { TickIcon } from "@/components/icons";

/** Segmented control (single choice). The selected segment is the only element with a shadow. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  stretch,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
  stretch?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex gap-[3px] rounded-[10px] bg-segment-track p-[3px]", stretch && "w-full sm:w-auto", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg px-3.5 text-sm font-semibold transition-colors",
              size === "lg" ? "h-11" : "h-[38px]",
              stretch && "flex-1 sm:flex-none",
              on ? "bg-segment-thumb text-ink shadow-[var(--shadow-segment)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** On/off switch with a visible label. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  className,
  hideLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : `${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn("flex h-6 w-[42px] shrink-0 rounded-full p-[3px] transition-colors", checked ? "justify-end bg-primary" : "justify-start bg-switch-off")}
      >
        <span className={cn("h-[18px] w-[18px] rounded-full", checked ? "bg-primary-fg" : "bg-switch-knob dark:bg-ink-3")} />
      </button>
      {!hideLabel && (
        <label id={`${id}-label`} htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
          {description && <span className="block text-xs font-normal text-ink-3">{description}</span>}
        </label>
      )}
    </div>
  );
}

/** Pill toggle with a tick when on (custom removal choices). */
export function ToggleChip({
  pressed,
  onChange,
  children,
  disabled,
}: {
  pressed: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onChange(!pressed)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors disabled:opacity-50",
        pressed
          ? "border-[1.5px] border-ink bg-surface font-semibold text-ink dark:bg-transparent"
          : "border border-line-strong bg-surface font-medium text-ink-2 hover:text-ink dark:bg-transparent",
      )}
    >
      {pressed && <TickIcon size={15} strokeWidth={2.6} />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="m-0 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 sm:text-[15px] dark:bg-ground";

export const selectClass =
  "h-11 w-full appearance-none rounded-[10px] border border-line-strong bg-surface px-3.5 pr-9 text-base text-ink sm:text-[15px] dark:bg-ground bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235F6878%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat";
