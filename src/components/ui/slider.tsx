"use client";

import { useId } from "react";

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format = (v) => String(v),
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[13px] font-medium tabular">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        className="exifo-range w-full disabled:opacity-50"
      />
    </div>
  );
}
