"use client";

import { applyPreset, keptSummary, SELECTIVE_PRESETS, type CustomSelection } from "@/lib/clean-options";
import { Segmented, Switch, ToggleChip } from "@/components/ui/controls";
import { useClean } from "@/store/clean";

const BLOCK_CHOICES: { key: keyof CustomSelection; label: string }[] = [
  { key: "exif", label: "EXIF" },
  { key: "xmp", label: "XMP" },
  { key: "iptc", label: "IPTC" },
  { key: "text", label: "Text and comments" },
  { key: "thumbnails", label: "Thumbnails" },
  { key: "c2pa", label: "Content Credentials" },
  { key: "other", label: "Other blocks" },
];

const EXIF_CHOICES: { key: keyof CustomSelection; label: string }[] = [
  { key: "gps", label: "Location" },
  { key: "device", label: "Device details" },
  { key: "dates", label: "Dates" },
];

export function OptionsBar() {
  const options = useClean((s) => s.options);
  const setOptions = useClean((s) => s.setOptions);
  const c = options.custom;
  const setCustom = (patch: Partial<CustomSelection>) => setOptions({ custom: { ...c, ...patch, keepCopyright: patch.keepCopyright ?? false } });

  return (
    <section aria-label="What to remove" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 max-sm:w-full">
          <h2 className="m-0 text-[15px] font-semibold">What to remove</h2>
          <Segmented
            stretch
            label="Removal preset"
            value={options.preset}
            onChange={(preset) => setOptions({ preset })}
            options={[
              { value: "all", label: "Remove everything" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </div>
        <Switch checked={options.keepOrientation} onChange={(keepOrientation) => setOptions({ keepOrientation })} label="Keep orientation" />
      </div>

      {options.preset === "custom" && (
        <div className="flex flex-col gap-3">
          {c.keepCopyright ? (
            <div className="flex flex-wrap items-center gap-2">
              <ToggleChip pressed onChange={() => setCustom({ keepCopyright: false })}>
                Keep copyright and creator only
              </ToggleChip>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Blocks to remove">
                {BLOCK_CHOICES.map((o) => (
                  <ToggleChip key={o.key} pressed={!!c[o.key]} onChange={(v) => setCustom({ [o.key]: v })}>
                    {o.label}
                  </ToggleChip>
                ))}
              </div>
              {!c.exif && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fields to remove inside EXIF">
                  <span className="mr-1 text-[13px] font-medium text-ink-2">Inside EXIF, remove</span>
                  {EXIF_CHOICES.map((o) => (
                    <ToggleChip key={o.key} pressed={!!c[o.key]} onChange={(v) => setCustom({ [o.key]: v })}>
                      {o.label}
                    </ToggleChip>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px]">
            <span className="mr-1 text-ink-3">Presets:</span>
            {SELECTIVE_PRESETS.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOptions({ custom: applyPreset(p.id) })}
                  className="rounded-md px-1 py-1 font-semibold text-proof hover:text-proof-hover hover:underline"
                >
                  {p.label}
                </button>
                {i < SELECTIVE_PRESETS.length - 1 && (
                  <span className="text-ink-3" aria-hidden="true">
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="m-0 text-[13px] leading-[1.5] text-ink-3">{keptSummary(options)}</p>
    </section>
  );
}
