"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ImageIcon } from "@/components/icons";

/** Square image thumbnail. `busy` sweeps a scan line over it while the file is processed. */
export function FileThumb({
  url,
  size = 56,
  className,
  alt = "",
  busy,
  tone = "tag",
}: {
  url?: string;
  size?: number;
  className?: string;
  alt?: string;
  busy?: boolean;
  /** Orange while metadata is read or removed; blue while an image is encoded. */
  tone?: "tag" | "proof";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-2 text-ink-3",
        busy && "exifo-scan",
        busy && tone === "proof" && "exifo-scan-proof",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon size={Math.round(size * 0.4)} />
      )}
    </div>
  );
}
