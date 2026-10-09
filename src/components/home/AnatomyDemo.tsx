import { AnatomyStrip, StripLegend } from "@/components/AnatomyStrip";
import { BlockChip, SignalBadge } from "@/components/ui/badges";
import type { Segment } from "@/lib/types";

/** A phone photo, segment by segment. */
const SEGMENTS: Segment[] = [
  { name: "SOI", offset: 0, size: 2, role: "image" },
  { name: "APP1 Exif", offset: 2, size: 21904, role: "meta", blockId: "exif" },
  { name: "APP1 XMP", offset: 21906, size: 3170, role: "meta", blockId: "xmp" },
  { name: "APP11 C2PA", offset: 25076, size: 14540, role: "meta", blockId: "c2pa" },
  { name: "APP2 ICC", offset: 39616, size: 548, role: "render" },
  { name: "DQT", offset: 40164, size: 134, role: "image" },
  { name: "SOF0", offset: 40298, size: 19, role: "image" },
  { name: "DHT", offset: 40317, size: 420, role: "image" },
  { name: "SOS + scan data", offset: 40737, size: 4050000, role: "image" },
  { name: "EOI", offset: 4090737, size: 2, role: "image" },
];
const META = new Set(["exif", "xmp", "c2pa"]);

export function AnatomyDemo() {
  return (
    <figure className="m-0 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[15px] font-semibold">IMG_4821.jpg</span>
        <span className="font-mono text-xs text-ink-3">JPEG · 4032 × 3024</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
          <span>Before</span>
          <span className="font-mono font-medium">4.09 MB</span>
        </div>
        <AnatomyStrip segments={SEGMENTS} willRemove={META} height={14} />
        <div className="flex flex-wrap gap-2 pt-1">
          <BlockChip>EXIF + GPS 21.9 KB</BlockChip>
          <BlockChip>C2PA 14.5 KB</BlockChip>
          <BlockChip>XMP 3.2 KB</BlockChip>
          <BlockChip kept>ICC 548 B kept</BlockChip>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
          <span>After</span>
          <span className="font-mono font-medium">4.05 MB</span>
        </div>
        <AnatomyStrip segments={SEGMENTS} removed={META} height={14} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <SignalBadge tone="proof" icon="tick">
            Image data identical
          </SignalBadge>
          <span className="text-[13px] text-ink-3">SHA-256 checked before download</span>
        </div>
      </div>
      <StripLegend className="border-t border-line pt-4" />
      <figcaption className="font-mono text-[12px] tracking-[0.04em] text-ink-3">
        FF D8 FF E1 55 98 <span className="font-semibold text-tag-deep">45 78 69 66</span> 00 00 4D 4D 00 2A … the first bytes of a JPEG. The highlighted four
        spell “Exif”.
      </figcaption>
    </figure>
  );
}
